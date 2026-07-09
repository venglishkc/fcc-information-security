import socket
import re

# common ports -> service name (subset used by freeCodeCamp's tests)
common_ports = {
    20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
    53: "domain", 67: "dhcps", 68: "dhcpc", 69: "tftp", 80: "http",
    110: "pop3", 111: "rpcbind", 123: "ntp", 135: "msrpc", 137: "netbios-ns",
    138: "netbios-dgm", 139: "netbios-ssn", 143: "imap", 161: "snmp",
    389: "ldap", 443: "https", 445: "microsoft-ds", 993: "imaps",
    995: "pop3s", 3306: "mysql", 3389: "ms-wbt-server", 5900: "vnc",
    8080: "http-proxy",
}

_ip_re = re.compile(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$")


def _looks_like_ip(target):
    m = _ip_re.match(target)
    if not m:
        return False
    return all(0 <= int(o) <= 255 for o in m.groups())


def get_open_ports(target, port_range, verbose=False):
    open_ports = []

    # Resolve target; distinguish invalid hostname vs invalid IP.
    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror:
        if _looks_like_ip(target):
            return "Error: Invalid IP address"
        return "Error: Invalid hostname"
    except socket.error:
        if _looks_like_ip(target):
            return "Error: Invalid IP address"
        return "Error: Invalid hostname"

    for port in range(port_range[0], port_range[1] + 1):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        try:
            if sock.connect_ex((ip, port)) == 0:
                open_ports.append(port)
        except socket.error:
            pass
        finally:
            sock.close()

    if not verbose:
        return open_ports

    # Verbose output
    try:
        host_name = socket.gethostbyaddr(ip)[0]
    except socket.herror:
        host_name = None

    if host_name and not _looks_like_ip(target):
        header = "Open ports for {} ({})".format(target, ip)
    elif host_name:
        header = "Open ports for {} ({})".format(host_name, ip)
    else:
        header = "Open ports for {}".format(ip)

    lines = [header, "PORT     SERVICE"]
    for port in open_ports:
        service = common_ports.get(port, "")
        lines.append("{:<9}{}".format(port, service))
    return "\n".join(lines)


if __name__ == "__main__":
    # quick manual check
    print(get_open_ports("scanme.nmap.org", [20, 80], verbose=True))
