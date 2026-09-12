# Installing Docker

Docker lets you run applications in isolated containers — lightweight, portable environments that include everything the application needs. For cybersecurity students, Docker is useful for running vulnerable applications to practice against, spinning up isolated lab services (web servers, databases, CTF challenges), and running security tools without affecting your main system.

---

## Windows and macOS: Docker Desktop

Docker Desktop is an all-in-one application that includes the Docker engine, a GUI dashboard, and all dependencies.

### Step 1: Check System Requirements

**Windows:**
- Windows 10/11 (64-bit), version 19041 or later
- WSL 2 enabled (Docker Desktop will help you set this up)
- Virtualization enabled in BIOS (same setting as VirtualBox)

**macOS:**
- macOS 12 (Monterey) or later
- Works natively on both Intel and Apple Silicon (M1/M2/M3)

### Step 2: Download Docker Desktop

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Click **Download for Windows** or **Download for Mac**

### Step 3: Install

**Windows:**
1. Run the downloaded installer
2. When prompted, select **Use WSL 2 instead of Hyper-V** (recommended)
3. Follow the wizard to completion
4. Restart your computer when prompted

If WSL 2 is not already installed, Docker Desktop will prompt you to install it. Follow the on-screen link to the Microsoft docs and return to the Docker installation after.

**macOS:**
1. Open the `.dmg` file
2. Drag **Docker** to Applications
3. Launch Docker from Applications
4. Follow the onboarding prompts and allow requested permissions

### Step 4: Verify

Open a terminal (PowerShell on Windows, Terminal on macOS):

```bash
docker --version
# Docker version 26.x.x, build ...

docker run hello-world
# Hello from Docker! ...
```

If `hello-world` prints a welcome message, Docker is working correctly.

---

## Linux (Ubuntu / Debian / Kali)

On Linux, you install the Docker Engine directly — no separate desktop app is needed.

### Step 1: Remove any old Docker packages

```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

### Step 2: Install Docker Engine

```bash
# Add Docker's official GPG key and repository
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

> **For Kali Linux**, replace `ubuntu` with `debian` in the repository URL, or simply install via:
> ```bash
> sudo apt update && sudo apt install -y docker.io docker-compose
> ```

### Step 3: Start Docker and run without sudo

```bash
# Enable and start the Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group (avoids needing sudo on every command)
sudo usermod -aG docker $(whoami)
```

**Log out and back in** for the group change to take effect, then verify:

```bash
docker run hello-world
```

---

## Core Concepts

| Term | What It Means |
|------|---------------|
| **Image** | A read-only blueprint for a container (like an ISO file) |
| **Container** | A running instance of an image (like a running VM) |
| **Registry** | A repository of images — Docker Hub is the public default |
| **Volume** | Persistent storage that survives when a container is deleted |

---

## Essential Commands

### Pulling and running images

```bash
# Download an image without running it
docker pull ubuntu:22.04

# Run a container interactively (drops you into a shell)
docker run -it ubuntu:22.04 bash

# Run and delete the container automatically when you exit
docker run --rm -it ubuntu:22.04 bash

# Run a container in the background
docker run -d nginx
```

### Mapping ports

Many security lab services need ports exposed to your host machine:

```bash
# Map container port 80 to host port 8080
docker run -p 8080:80 nginx

# Then visit http://localhost:8080 in your browser
```

### Working with running containers

```bash
docker ps                         # List running containers
docker ps -a                      # List all containers (including stopped)
docker stop <container_id>        # Stop a running container
docker rm <container_id>          # Delete a stopped container
docker exec -it <container_id> bash   # Open a shell in a running container
```

### Managing images

```bash
docker images                     # List downloaded images
docker rmi <image_name>           # Delete an image
docker pull kalilinux/kali-rolling  # Pull the official Kali image
```

---

## Running Vulnerable Lab Applications

Docker makes it easy to spin up intentionally vulnerable web apps for practice:

### DVWA (Damn Vulnerable Web Application)

```bash
docker run -d -p 8080:80 vulnerables/web-dvwa
# Visit http://localhost:8080 — default login: admin / password
```

### Juice Shop (OWASP's modern vulnerable app)

```bash
docker run -d -p 3000:3000 bkimminich/juice-shop
# Visit http://localhost:3000
```

### WebGoat (OWASP learning platform)

```bash
docker run -d -p 8888:8888 webgoat/webgoat
# Visit http://localhost:8888/WebGoat
```

Stop and clean up when done:

```bash
docker stop $(docker ps -q)    # Stop all running containers
docker rm $(docker ps -aq)     # Remove all stopped containers
```

---

## Docker Compose

Docker Compose lets you define multi-container environments in a single file — useful for CTF challenge setups that include a web app, database, and backend together.

Example `docker-compose.yml`:

```yaml
services:
  web:
    image: nginx
    ports:
      - "8080:80"
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: example
```

Start the entire environment with one command:

```bash
docker compose up -d        # Start in background
docker compose down         # Stop and remove containers
```

---

## Troubleshooting

**"Cannot connect to the Docker daemon" on Linux**

Docker is not running. Start it:

```bash
sudo systemctl start docker
```

If the service fails to start, check logs: `journalctl -u docker --no-pager`

**"Permission denied while trying to connect" on Linux**

Your user is not in the `docker` group, or the group membership change has not taken effect. Run:

```bash
sudo usermod -aG docker $(whoami)
newgrp docker    # Apply without logging out
```

**Docker Desktop hangs on "Starting" on Windows**

WSL 2 may not be fully installed. Open PowerShell as Administrator and run:

```powershell
wsl --install
wsl --update
```

Then restart your computer and try again.

**"No space left on device" error**

Docker accumulates unused images and containers over time. Clean up:

```bash
docker system prune -a    # Remove all stopped containers, unused images, and build cache
```

---

## FAQ

**Is Docker a replacement for VirtualBox and Kali?**
No. Containers share the host OS kernel — they are not full virtual machines and do not provide full OS isolation. Docker is best for running individual services and applications. Use VirtualBox with Kali for coursework that requires a complete Linux environment, a different kernel, or network-level isolation.

**Are vulnerable Docker images safe to run on my machine?**
The vulnerable application runs inside the container, but Docker is not perfect isolation. Never expose vulnerable containers to the internet (use `localhost` port bindings only). After lab work, stop and remove the containers promptly.

**Can I run Docker inside my Kali VM?**
Yes, and this is a good pattern for double-isolation: run Docker inside Kali for vulnerable web apps, keeping them isolated both by the container layer and the VM boundary.

**Does Docker work on Apple Silicon (M1/M2/M3)?**
Yes. Docker Desktop for Mac supports Apple Silicon natively. Some older images are built for x86 only — Docker can run them using emulation, but performance will be slower. Look for images tagged `linux/arm64` for best performance.
