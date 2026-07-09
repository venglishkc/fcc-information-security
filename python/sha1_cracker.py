import hashlib

# freeCodeCamp provides these two files with the boilerplate:
#   top-10000-passwords.txt  (one candidate password per line)
#   known-salts.txt          (one salt per line)


def _read_lines(path):
    try:
        with open(path, "r") as f:
            return [line.strip() for line in f]
    except FileNotFoundError:
        return []


def crack_sha1_hash(hash, use_salts=False):
    passwords = _read_lines("top-10000-passwords.txt")
    salts = _read_lines("known-salts.txt") if use_salts else []

    for password in passwords:
        if not use_salts:
            if hashlib.sha1(password.encode()).hexdigest() == hash:
                return password
        else:
            for salt in salts:
                # try salt prepended and appended
                if hashlib.sha1((salt + password).encode()).hexdigest() == hash:
                    return password
                if hashlib.sha1((password + salt).encode()).hexdigest() == hash:
                    return password

    return "PASSWORD NOT IN DATABASE"


if __name__ == "__main__":
    # sha1("sammy123") == c92cc1f...  (example without salt)
    print(crack_sha1_hash("b305921a3723cd5d70a375cd21a61e60aabb84ec"))
    print(crack_sha1_hash("c7ab388a5ebefbf4d550652f1eb4d833e5316e3e"))
