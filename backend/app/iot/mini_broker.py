import asyncio
import struct
import logging

logging.basicConfig(level=logging.INFO, format="[MQTT Broker] %(asctime)s - %(message)s")
logger = logging.getLogger("MiniBroker")

class SimpleMQTTBroker:
    def __init__(self, host="0.0.0.0", port=1883):
        self.host = host
        self.port = port
        self.clients = set()
        self.subscriptions = {} # topic -> set of clients

    def _decode_varlen(self, data, offset=0):
        multiplier = 1
        value = 0
        idx = offset
        while True:
            if idx >= len(data):
                return None, 0
            byte = data[idx]
            idx += 1
            value += (byte & 127) * multiplier
            multiplier *= 128
            if (byte & 128) == 0:
                break
        return value, idx - offset

    def _encode_varlen(self, length):
        encoded = bytearray()
        while True:
            digit = length % 128
            length //= 128
            if length > 0:
                digit |= 0x80
            encoded.append(digit)
            if length == 0:
                break
        return bytes(encoded)

    async def handle_client(self, reader, writer):
        addr = writer.get_extra_info("peername")
        logger.info(f"New connection from {addr}")
        client_subs = set()
        self.clients.add(writer)

        try:
            while True:
                header = await reader.read(1)
                if not header:
                    break
                pkt_type = header[0] >> 4
                flags = header[0] & 0x0F

                # Read remaining length
                rem_len = 0
                mult = 1
                while True:
                    b = await reader.read(1)
                    if not b:
                        break
                    val = b[0]
                    rem_len += (val & 127) * mult
                    mult *= 128
                    if (val & 128) == 0:
                        break

                body = b""
                if rem_len > 0:
                    body = await reader.readexactly(rem_len)

                # Packet Type 1: CONNECT
                if pkt_type == 1:
                    connack = bytes([0x20, 0x02, 0x00, 0x00]) # Accepted
                    writer.write(connack)
                    await writer.drain()
                    logger.info(f"Client {addr} connected (CONNACK sent)")

                # Packet Type 8: SUBSCRIBE
                elif pkt_type == 8:
                    if len(body) >= 2:
                        pkt_id = struct.unpack("!H", body[:2])[0]
                        idx = 2
                        sub_topics = []
                        while idx < len(body):
                            if idx + 2 > len(body):
                                break
                            tlen = struct.unpack("!H", body[idx:idx+2])[0]
                            idx += 2
                            topic = body[idx:idx+tlen].decode("utf-8", errors="ignore")
                            idx += tlen
                            if idx < len(body):
                                qos = body[idx]
                                idx += 1
                            sub_topics.append(topic)
                            if topic not in self.subscriptions:
                                self.subscriptions[topic] = set()
                            self.subscriptions[topic].add(writer)
                            client_subs.add(topic)
                        suback = bytes([0x90, 0x03, body[0], body[1], 0x00])
                        writer.write(suback)
                        await writer.drain()
                        logger.info(f"Client {addr} subscribed to {sub_topics}")

                # Packet Type 3: PUBLISH
                elif pkt_type == 3:
                    qos = (flags >> 1) & 0x03
                    idx = 0
                    if idx + 2 <= len(body):
                        tlen = struct.unpack("!H", body[idx:idx+2])[0]
                        idx += 2
                        topic = body[idx:idx+tlen].decode("utf-8", errors="ignore")
                        idx += tlen
                        pkt_id = None
                        if qos > 0 and idx + 2 <= len(body):
                            pkt_id = struct.unpack("!H", body[idx:idx+2])[0]
                            idx += 2
                        payload = body[idx:]
                        logger.info(f"PUBLISH [{topic}] ({len(payload)} bytes)")

                        # If QoS 1, send PUBACK
                        if qos == 1 and pkt_id is not None:
                            puback = bytes([0x40, 0x02, (pkt_id >> 8) & 0xFF, pkt_id & 0xFF])
                            writer.write(puback)
                            await writer.drain()

                        # Forward to matching subscribers
                        await self.broadcast(topic, payload)

                # Packet Type 12: PINGREQ
                elif pkt_type == 12:
                    writer.write(bytes([0xD0, 0x00]))
                    await writer.drain()

                # Packet Type 14: DISCONNECT
                elif pkt_type == 14:
                    logger.info(f"Client {addr} disconnected cleanly")
                    break

        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        except Exception as e:
            logger.warning(f"Error handling client {addr}: {e}")
        finally:
            logger.info(f"Connection closed for {addr}")
            self.clients.discard(writer)
            for t in client_subs:
                if t in self.subscriptions:
                    self.subscriptions[t].discard(writer)
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def broadcast(self, topic: str, payload: bytes):
        topic_bytes = topic.encode("utf-8")
        body = struct.pack("!H", len(topic_bytes)) + topic_bytes + payload
        rem_len_bytes = self._encode_varlen(len(body))
        packet = bytes([0x30]) + rem_len_bytes + body

        # Find target clients
        targets = set()
        for sub_filter, client_set in self.subscriptions.items():
            if sub_filter == topic or sub_filter == "#":
                targets.update(client_set)
            elif sub_filter.endswith("/#"):
                prefix = sub_filter[:-2]
                if topic.startswith(prefix):
                    targets.update(client_set)

        for w in targets:
            try:
                w.write(packet)
                await w.drain()
            except Exception:
                pass
        if targets:
            logger.info(f"Broadcasted [{topic}] to {len(targets)} subscriber(s)")

    async def start(self):
        try:
            server = await asyncio.start_server(self.handle_client, self.host, self.port)
            logger.info(f"Mini MQTT Broker running on {self.host}:{self.port}")
            async with server:
                await server.serve_forever()
        except OSError as e:
            logger.info(f"Port {self.port} already in use ({e}). Assuming external MQTT broker is running.")
        except asyncio.CancelledError:
            logger.info("Mini MQTT Broker stopped.")

if __name__ == "__main__":
    broker = SimpleMQTTBroker()
    asyncio.run(broker.start())
