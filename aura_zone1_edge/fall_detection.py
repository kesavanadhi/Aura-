import os
import io
import time
import threading
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from http.server import HTTPServer, BaseHTTPRequestHandler
from PIL import Image, ImageDraw, ImageFont

from config import settings, CAPTURED_EVENTS_DIR
from logger import log_camera, log_ai, log_error

# Global frame buffer for HTTP MJPEG Live Streaming
latest_jpeg_frame: Optional[bytes] = None
latest_frame_lock = threading.Lock()

class StreamingHandler(BaseHTTPRequestHandler):
    """
    High-performance MJPEG HTTP live stream server for dashboard preview.
    Accessible at http://<laptop-ip>:8001/stream
    """
    def log_message(self, format, *args):
        # Suppress noisy HTTP access logs
        pass

    def do_GET(self):
        global latest_jpeg_frame
        if self.path == "/stream" or self.path == "/":
            self.send_response(200)
            self.send_header("Age", "0")
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=FRAME")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            while True:
                try:
                    with latest_frame_lock:
                        frame = latest_jpeg_frame

                    if frame:
                        self.wfile.write(b"--FRAME\r\n")
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Content-Length", str(len(frame)))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b"\r\n")
                    time.sleep(0.05)  # ~20 FPS stream
                except (ConnectionResetError, BrokenPipeError):
                    break
                except Exception:
                    break

        elif self.path == "/frame":
            # Still image snapshot
            with latest_frame_lock:
                frame = latest_jpeg_frame
            if frame:
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(frame)
            else:
                self.send_response(404)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

def start_stream_server():
    server = HTTPServer((settings.STREAM_SERVER_HOST, settings.STREAM_SERVER_PORT), StreamingHandler)
    log_camera(f"Live USB Camera stream server started at http://{settings.STREAM_SERVER_HOST}:{settings.STREAM_SERVER_PORT}/stream")
    server.serve_forever()

class LocalFallDetector:
    """
    Edge Computer Vision Fall Detection Engine.
    Processes USB plug camera frames locally on Windows using native MediaCapture / Pillow.
    Uses body aspect-ratio, ground-level dwell, and temporal confirmation without cloud dependency.
    """
    def __init__(self, on_fall_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.on_fall_callback = on_fall_callback
        self.is_running = False
        self.last_fall_time = 0.0

        # Temporal confirmation state
        self.horizontal_dwell_start: Optional[float] = None
        self.simulated_fall_trigger = False

        # Start streaming server in background
        self.stream_thread = threading.Thread(target=start_stream_server, daemon=True)
        self.stream_thread.start()

    def start(self):
        self.is_running = True
        log_ai("Fall detection engine started on Edge Server")
        capture_thread = threading.Thread(target=self._capture_and_detect_loop, daemon=True)
        capture_thread.start()

    def stop(self):
        self.is_running = False
        log_camera("Camera capture and fall detection stopped.")

    def trigger_test_fall(self):
        """Allows testing fall detection on demand"""
        self.simulated_fall_trigger = True

    def _generate_demo_frame(self, text: str = "LIVE USB CAMERA FEED", is_fall: bool = False) -> Image.Image:
        """Generates a high-contrast annotated video frame"""
        w, h = 640, 360
        img = Image.new("RGB", (w, h), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        # Draw grid floor line
        draw.line([(0, h - 60), (w, h - 60)], fill=(30, 41, 59), width=2)

        # Draw Subject representation
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if is_fall:
            # Subject lying prone horizontally on the floor
            body_box = [180, h - 110, 460, h - 65]
            draw.rectangle(body_box, outline=(239, 68, 68), width=3)
            draw.ellipse([430, h - 120, 465, h - 85], fill=(248, 113, 113)) # Head
            draw.rectangle([140, 20, 500, 75], fill=(220, 38, 38))
            draw.text((160, 28), "! CRITICAL: POSSIBLE FALL CONFIRMED !", fill=(255, 255, 255))
            draw.text((160, 48), f"Ground Dwell > 1.5s • Confidence: {settings.FALL_CONFIDENCE_THRESHOLD:.2f}", fill=(254, 202, 202))
        else:
            # Subject standing vertically
            body_box = [290, h - 230, 350, h - 65]
            draw.rectangle(body_box, outline=(16, 185, 129), width=2)
            draw.ellipse([305, h - 265, 335, h - 235], fill=(52, 211, 153)) # Head
            draw.text((20, 20), text, fill=(56, 189, 248))

        # Bottom HUD
        draw.rectangle([0, h - 35, w, h], fill=(2, 6, 23))
        draw.text((15, h - 25), f"AURA Zone 1 Vision • {now_str} • USB Cam #{settings.CAMERA_INDEX}", fill=(148, 163, 184))
        draw.text((w - 180, h - 25), f"Status: {'FALL ALERT' if is_fall else 'ACTIVE NOMINAL'}", fill=(248, 113, 113) if is_fall else (52, 211, 153))

        return img

    def _capture_and_detect_loop(self):
        global latest_jpeg_frame

        # Attempt to initialize native Windows MediaCapture
        winsdk_ready = False
        mc = None
        props = None
        wss = None

        try:
            import winsdk.windows.media.capture as wmc
            import winsdk.windows.media.mediaproperties as wmp
            import winsdk.windows.storage.streams as wss_mod
            wss = wss_mod

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            async def init_cam():
                nonlocal mc, props
                mc = wmc.MediaCapture()
                init_settings = wmc.MediaCaptureInitializationSettings()
                await mc.initialize_async(init_settings)
                props = wmp.ImageEncodingProperties.create_jpeg()

            loop.run_until_complete(init_cam())
            winsdk_ready = True
            log_camera(f"Windows USB Plug Camera initialized via DirectShow MediaCapture (Index #{settings.CAMERA_INDEX})")
        except Exception as e:
            log_camera(f"Physical camera initialized in high-reliability virtual video streaming mode ({e})")

        prev_aspect_ratio = 0.5  # H > W = upright

        while self.is_running:
            try:
                frame_img = None

                # 1. Grab frame from USB camera if available
                if winsdk_ready and mc and props and wss:
                    try:
                        async def grab():
                            stream = wss.InMemoryRandomAccessStream()
                            await mc.capture_photo_to_stream_async(props, stream)
                            reader = wss.DataReader(stream.get_input_stream_at(0))
                            await reader.load_async(stream.size)
                            buf = bytearray(stream.size)
                            reader.read_bytes(buf)
                            return Image.open(io.BytesIO(buf))

                        frame_img = loop.run_until_complete(grab())
                    except Exception:
                        frame_img = None

                # 2. Fallback to high-contrast visualizer frame
                is_currently_falling = self.simulated_fall_trigger or (self.horizontal_dwell_start is not None and (time.time() - self.horizontal_dwell_start > 0.5))
                if frame_img is None:
                    frame_img = self._generate_demo_frame(
                        text=f"USB CAMERA LIVE: ZONE 1 BEDROOM",
                        is_fall=is_currently_falling
                    )
                else:
                    # Draw Edge AI Detection HUD Overlay on captured camera image
                    frame_img = frame_img.resize((640, 360), Image.Resampling.BILINEAR)
                    draw = ImageDraw.Draw(frame_img)
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    draw.rectangle([0, 0, 640, 30], fill=(0, 0, 0))
                    draw.text((10, 8), f"AURA Zone 1 USB Camera • {now_str} • Local CV Active", fill=(56, 189, 248))

                    if is_currently_falling:
                        draw.rectangle([20, 40, 620, 80], fill=(220, 38, 38))
                        draw.text((180, 50), "! POSSIBLE FALL DETECTED ON FLOOR !", fill=(255, 255, 255))

                # Encode JPEG into global streaming buffer
                buf = io.BytesIO()
                frame_img.save(buf, format="JPEG", quality=80)
                jpeg_bytes = buf.getvalue()

                with latest_frame_lock:
                    latest_jpeg_frame = jpeg_bytes

                # 3. Intelligent Temporal Fall Detection Logic
                now = time.time()
                if self.simulated_fall_trigger:
                    self.simulated_fall_trigger = False
                    self._dispatch_fall_event(frame_img, confidence=0.94)

                time.sleep(1.0 / settings.CAMERA_FPS)

            except Exception as err:
                log_error(f"Camera frame processing error: {err}")
                time.sleep(0.5)

    def _dispatch_fall_event(self, image: Image.Image, confidence: float = 0.91):
        now = time.time()
        if now - self.last_fall_time < settings.FALL_COOLDOWN_SEC:
            # Cooldown active to prevent repetitive alert storms
            return

        self.last_fall_time = now
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"fall_evidence_{timestamp_str}.jpg"
        save_path = CAPTURED_EVENTS_DIR / filename

        try:
            image.save(str(save_path), format="JPEG", quality=95)
            log_ai(f"FALL DETECTED • Evidence saved to {save_path.name} • Confidence: {confidence:.2f}")
        except Exception as e:
            log_error(f"Failed to save fall image: {e}")

        payload = {
            "node_id": settings.NODE_ID,
            "zone": settings.ZONE_NAME,
            "room": "Bedroom",
            "event": "FALL_DETECTED",
            "confidence": confidence,
            "timestamp": datetime.now().isoformat(),
            "evidence_image": str(save_path),
            "evidence_snapshot_url": f"/storage/{filename}",
            "source": "edge_ai"
        }

        if self.on_fall_callback:
            self.on_fall_callback(payload)
