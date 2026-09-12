# Linux Command Line Basics

The Linux command line is the primary environment for cybersecurity work. Tools like Wireshark, Nmap, Metasploit, and nearly every security utility run on Linux. This tutorial teaches the commands you will use every day.

---

## 1. Navigation

**Print current directory:**

```bash
pwd
```

**List files in the current directory:**

```bash
ls
ls -la        # Show hidden files and permissions
ls -lh        # Human-readable file sizes
```

**Change directory:**

```bash
cd /etc             # Go to /etc
cd ~                # Go to home directory
cd ..               # Go up one level
cd -                # Go back to previous directory
```

**Create a directory:**

```bash
mkdir my-folder
mkdir -p path/to/nested/folder     # Create parent dirs too
```

---

## 2. Files and Text

**View a file:**

```bash
cat filename.txt            # Print entire file
less filename.txt           # Scroll through (q to quit)
head -n 20 filename.txt     # First 20 lines
tail -n 20 filename.txt     # Last 20 lines
tail -f /var/log/syslog     # Follow a live log file
```

**Create or edit files:**

```bash
touch newfile.txt            # Create empty file
nano filename.txt            # Simple text editor (beginner-friendly)
vim filename.txt             # Advanced editor (i to insert, Esc then :wq to save)
```

**Copy, move, delete:**

```bash
cp source.txt dest.txt          # Copy file
cp -r folder/ destination/      # Copy directory
mv old.txt new.txt              # Move/rename
rm filename.txt                 # Delete file
rm -rf folder/                  # Delete directory (careful!)
```

> **Warning:** `rm -rf` deletes permanently with no confirmation. Double-check before running.

---

## 3. Searching

**Find files by name:**

```bash
find / -name "passwords.txt"     # Search entire filesystem
find . -name "*.py"              # Search current dir for Python files
find /home -type d               # Find directories only
```

**Search inside files:**

```bash
grep "error" logfile.txt         # Lines containing "error"
grep -r "password" /etc/         # Recursive search
grep -i "password" file.txt      # Case-insensitive
grep -n "TODO" script.py         # Show line numbers
```

---

## 4. Permissions

Every file has three permission sets: **owner**, **group**, **others**.

```bash
ls -la
# -rw-r--r-- 1 alice staff 1234 Jan 1 12:00 file.txt
#  ^owner ^group ^others
```

Permission bits: `r` = read (4), `w` = write (2), `x` = execute (1)

**Change permissions:**

```bash
chmod 755 script.sh     # rwxr-xr-x  (owner: all, group/others: read+exec)
chmod 600 private.key   # rw-------  (owner: read+write only)
chmod +x script.sh      # Add execute for all
```

**Change ownership:**

```bash
chown alice file.txt            # Change owner
chown alice:devs file.txt       # Change owner and group
sudo chown root /etc/config     # Requires elevated privileges
```

---

## 5. Processes

**List running processes:**

```bash
ps aux                  # All processes
ps aux | grep apache    # Filter for a specific process
top                     # Live process viewer (q to quit)
htop                    # Better live viewer (if installed)
```

**Kill a process:**

```bash
kill 1234               # Send TERM signal to PID 1234
kill -9 1234            # Force kill (SIGKILL)
pkill firefox           # Kill by process name
```

**Run in background:**

```bash
nmap 192.168.1.0/24 &   # Run in background
jobs                     # List background jobs
fg                       # Bring job to foreground
```

---

## 6. Networking Commands

```bash
ip addr                 # Show IP addresses (replaces ifconfig)
ip route                # Show routing table
ping google.com         # Test connectivity
traceroute google.com   # Trace route to host
netstat -tulnp          # Show listening ports (requires root for all)
ss -tulnp               # Modern replacement for netstat
curl https://example.com    # Fetch a URL
wget https://example.com/file.zip   # Download a file
```

---

## 7. Users and Sudo

```bash
whoami                  # Current username
id                      # User ID and group memberships
sudo command            # Run command as root
sudo -i                 # Open root shell
su - username           # Switch user
```

---

## 8. Pipes and Redirection

**Pipe** (`|`) sends output of one command as input to another:

```bash
cat /etc/passwd | grep bash     # Show users with bash shell
ps aux | sort -k3 -rn | head    # Top processes by CPU
ls -la | wc -l                  # Count files in directory
```

**Redirect output to files:**

```bash
command > output.txt        # Write stdout to file (overwrite)
command >> output.txt       # Append stdout to file
command 2> errors.txt       # Write stderr to file
command 2>&1 | tee log.txt  # Redirect both and display
```

---

## Key Takeaways

- `man command` opens the manual page for any command
- Use `Tab` for autocomplete — it saves time and prevents typos
- Use `Ctrl+C` to kill a running command
- Use `Ctrl+R` to search command history
- `sudo` gives temporary root access — use it deliberately

---

*These commands form the foundation for every security tool you will use. Practice them daily until they feel natural.*
