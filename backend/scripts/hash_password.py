"""Generate the bcrypt hash used for ADMIN_PASSWORD_HASH.

Usage: python scripts/hash_password.py <your_password>
"""
import sys

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/hash_password.py <your_password>")
        sys.exit(1)
    print(pwd_context.hash(sys.argv[1]))
