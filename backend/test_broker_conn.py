import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import asyncio
import threading
import time
import paho.mqtt.client as mqtt
from app.iot.mini_broker import SimpleMQTTBroker

received = []

def run_broker():
    broker = SimpleMQTTBroker(host="127.0.0.1", port=1883)
    asyncio.run(broker.start())

t = threading.Thread(target=run_broker, daemon=True)
t.start()
time.sleep(1)

def on_message(client, userdata, msg):
    print("Received message:", msg.topic, msg.payload.decode())
    received.append((msg.topic, msg.payload.decode()))

client = mqtt.Client(client_id="test_client")
client.on_message = on_message
client.connect("127.0.0.1", 1883, 60)
client.subscribe("aura/telemetry/node1")
client.loop_start()
time.sleep(0.5)

client.publish("aura/telemetry/node1", '{"test": "ok"}')
time.sleep(1)

assert len(received) > 0, "No message received!"
print("TEST PASSED! Broker works 100%!")
client.loop_stop()
client.disconnect()
