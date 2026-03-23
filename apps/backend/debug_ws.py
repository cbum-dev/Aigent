
import asyncio
import json
import httpx
import websockets
import sys
import time

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000"

async def main():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        email = f"debug_{int(time.time())}@example.com"
        password = "password123"
        
        try:
            resp = await client.post("/auth/register", json={
                "email": email, 
                "password": password, 
                "full_name": "Debug User",
                "company_name": "Debug Co"
            })
            if resp.status_code == 200:
                token = resp.json()["access_token"]
            else:
                if resp.status_code != 201:
                    print(f"Register failed: {resp.status_code} {resp.text}")

                resp = await client.post("/auth/login", json={"email": email, "password": password})
                resp.raise_for_status()
                token = resp.json()["access_token"]
        except Exception as e:
            print(f"Auth failed: {e}")
            return

        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/connections", headers=headers)
        connections = resp.json()
        
        connection_id = None
        if connections:
            connection_id = connections[0]["id"]
            print(f"Using existing connection: {connection_id}")
        else:
             conn_data = {
                 "name": "Local Debug DB",
                 "host": "localhost",
                 "port": 5432,
                 "database": "aigent",
                 "username": "postgres",
                 "password": "postgres" 
             }
             resp = await client.post("/connections", headers=headers, json=conn_data)
             if resp.status_code in [200, 201]:
                 connection_id = resp.json()["id"]
                 print(f"Created local connection: {connection_id}")
             else:
                 print(f"Failed to create connection: {resp.text}")
                 return

        print("Creating conversation...")
        resp = await client.post("/conversations", headers=headers, json={"title": "Debug Chat", "database_connection_id": connection_id})
        try:
             resp.raise_for_status()
        except:
             print(resp.text)
             return
             
        conversation_id = resp.json()["id"]
        print(f"Conversation created: {conversation_id}")

        ws_endpoint = f"{WS_URL}/chat/{conversation_id}?token={token}"
        print(f"Connecting to WS: {ws_endpoint}")
        
        try:
            async with websockets.connect(ws_endpoint) as websocket:
                print("WS Connected!")
                
                msg = {"content": "Show me tables in database"}
                await websocket.send(json.dumps(msg))
                print(f"Sent: {msg}")
                

                while True:
                    resp = await websocket.recv()
                    data = json.loads(resp)
                    print(f"Received: {data['type']}")
                    if data['type'] == 'result':
                        print(f"RESULT CONTENT: {data.get('content')}")
                        print(f"FULL RESULT: {data}")
                        await websocket.close()
                        break
                    elif data['type'] == 'error':
                        print(f"ERROR: {data}")
                        await websocket.close()
                        break
                        
        except Exception as e:
            print(f"WS Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
