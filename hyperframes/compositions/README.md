Generated HyperFrames compositions are written per project at runtime:

    data/projects/<projectId>/scenes/<sceneId>/index.html   (render input)
    data/projects/<projectId>/scenes/<sceneId>/render.mp4   (verified scene output)
    data/projects/<projectId>/preview/<sceneId>/index.html  (live dashboard preview)

Each folder is self-contained (lib/ holds pinned GSAP, Three.js and fonts copied from
node_modules; assets/ holds the scene's media), so the renderer never touches the network.
Templates live in ../templates.
