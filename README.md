# SuperSplat Editor

## Local Development

To initialize a local development environment for SuperSplat, ensure you have [Node.js](https://nodejs.org/) 18 or later installed. Follow these steps:

1. Clone the repository:

   ```sh
   git clone https://github.com/playcanvas/supersplat.git
   cd supersplat
   ```

2. The Python script `src/app.py` is the backend for the segmentation functionality
   and can be run using the command:
   ```sh
   python -m flask run
   ```
   on a machine with CUDA and [SAM 2](https://github.com/facebookresearch/sam2) installed.
   If the machine is not the same as the one running the frontend,
   open an SSH tunnel on the frontend machine:
   ```sh
   ssh -NfL 5000:localhost:5000 <IP-of-the-backend-machine>
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Build SuperSplat and start a local web server:

   ```sh
   npm run develop
   ```

5. Open a web browser tab and make sure network caching is disabled on the network tab and the other application caches are clear:

   - On Safari you can use `Cmd+Option+e` or Develop->Empty Caches.
   - On Chrome ensure the options "Update on reload" and "Bypass for network" are enabled in the Application->Service workers tab:

   <img width="846" alt="Screenshot 2025-04-25 at 16 53 37" src="https://github.com/user-attachments/assets/888bac6c-25c1-4813-b5b6-4beecf437ac9" />

6. Navigate to `http://localhost:3000`

When changes to the source are detected, SuperSplat is rebuilt automatically. Simply refresh your browser to see your changes.

