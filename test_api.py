import requests
import sys

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("Testing ManuMind AI APIs...")
    
    # 1. Test Login
    print("1. Testing Login...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin@manumind.ai", "password": "admin123"})
        if response.status_code != 200:
            print(f"Login failed! Status: {response.status_code}, Response: {response.text}")
            return
        token = response.json().get("access_token")
        print("Login successful! Got Token.")
    except Exception as e:
        print(f"Exception during login: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Get Current User
    print("2. Testing Get Current User...")
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        print("Get Current User successful!")
    else:
        print(f"Failed: {response.status_code}, {response.text}")

    # 3. Test Dashboard Overview
    print("3. Testing Dashboard Overview...")
    response = requests.get(f"{BASE_URL}/dashboard/overview", headers=headers)
    if response.status_code == 200:
        print("Dashboard Overview successful!")
    else:
        print(f"Failed: {response.status_code}, {response.text}")

    # 4. Test Dashboard KPIs
    print("4. Testing Dashboard KPIs...")
    response = requests.get(f"{BASE_URL}/dashboard/kpis", headers=headers)
    if response.status_code == 200:
        print("Dashboard KPIs successful!")
    else:
        print(f"Failed: {response.status_code}, {response.text}")

    # 5. Test Production Trend
    print("5. Testing Production Trend...")
    response = requests.get(f"{BASE_URL}/dashboard/production-trend", headers=headers)
    if response.status_code == 200:
        print("Production Trend successful!")
    else:
        print(f"Failed: {response.status_code}, {response.text}")

    # 6. Test Machine Utilization
    print("6. Testing Machine Utilization...")
    response = requests.get(f"{BASE_URL}/dashboard/machine-utilization", headers=headers)
    if response.status_code == 200:
        print("Machine Utilization successful!")
    else:
        print(f"Failed: {response.status_code}, {response.text}")

    print("All tests completed.")

if __name__ == "__main__":
    run_tests()
