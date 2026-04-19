from core.auth import hash_password, verify_password

# Test the admin password
hashed = hash_password("admin123")
print(f"Hashed password: {hashed}")
print(f"Verify 'admin123': {verify_password('admin123', hashed)}")
print(f"Verify 'Admin123': {verify_password('Admin123', hashed)}")
print(f"Verify 'admin': {verify_password('admin', hashed)}")
