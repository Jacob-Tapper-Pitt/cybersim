# Installing OWASP Juice Shop

OWASP Juice Shop is an intentionally vulnerable web application for learning web security. Run it locally and use it with the CyberSim labs, Burp Suite, or a browser configured for testing.

> **Safety note:** Juice Shop is designed to be attacked, but keep it bound to your own machine or an isolated lab network. Do not expose an intentionally vulnerable application to the public internet.

## Requirements

Choose one of these setup methods:

- Docker Desktop or Docker Engine
- Node.js 18.20 or newer and npm
- A local browser

Docker is recommended because it keeps the application and its dependencies isolated.

## Option 1: Run with Docker

Install Docker using the Docker guide in this course, then start Juice Shop:

```bash
docker run --rm -d --name juice-shop -p 127.0.0.1:3000:3000 bkimminich/juice-shop
```

Open **http://localhost:3000** in your browser. The first run downloads the image and may take a few minutes.

Check the container:

```bash
docker ps
```

Stop it when finished:

```bash
docker stop juice-shop
```

The `127.0.0.1` binding keeps the lab available only from your computer.

## Option 2: Run with Node.js

1. Install Node.js from **https://nodejs.org/**.
2. Verify Node.js and npm:

```bash
node --version
npm --version
```

3. Download the Juice Shop source from **https://github.com/juice-shop/juice-shop/releases** or clone the authorized course copy.
4. From the project directory, install dependencies and start the app:

```bash
npm install
npm start
```

Open **http://localhost:3000**.

## Verify the Installation

1. Visit `http://localhost:3000`.
2. Confirm the Juice Shop landing page loads.
3. Open the **Score Board** from the application menu.
4. Confirm that the application remains available after refreshing the page.

Do not use real credentials or personal data in the application.

## Using Juice Shop with Burp Suite

1. Start Juice Shop on port 3000.
2. Configure a dedicated Firefox profile to use Burp at `127.0.0.1:8080`.
3. Browse to `http://localhost:3000`.
4. Review requests in Burp Proxy history.
5. Keep Burp interception limited to the local Juice Shop target.

## Useful Docker Commands

```bash
# View application logs
docker logs juice-shop

# Restart the lab
docker restart juice-shop

# Remove the stopped container
docker rm juice-shop
```

To use a different host port, map it to the container's port 3000:

```bash
docker run --rm -d --name juice-shop -p 127.0.0.1:8080:3000 bkimminich/juice-shop
```

Then open `http://localhost:8080`.

## Troubleshooting

**Port 3000 is already in use**

Use another host port, such as `127.0.0.1:8080:3000`, and open the matching URL.

**The page does not load immediately**

Wait for the container to finish starting, then check the logs:

```bash
docker logs -f juice-shop
```

Press `Ctrl+C` to stop following the logs.

**Docker cannot pull the image**

Confirm Docker is running and that your machine has internet access. Retry with:

```bash
docker pull bkimminich/juice-shop
docker run --rm -d --name juice-shop -p 127.0.0.1:3000:3000 bkimminich/juice-shop
```

**You accidentally exposed the app to the network**

Stop the container and restart it with the explicit `127.0.0.1` binding shown above. Avoid using `-p 3000:3000` on shared networks.

## Clean Up

When you finish a session, stop the container and remove it if you no longer need it:

```bash
docker stop juice-shop
docker rm juice-shop
```
