const bg3dCanvas = document.getElementById('bg3dCanvas');
const bg3dContainer = document.getElementById('bg-3d-overlay');

const scene = new THREE.Scene();
const camera3d = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: bg3dCanvas, alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const cubes = [];
const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4
});

for (let i = 0; i < 40; i++) {
    const size = Math.random() * 2 + 0.5;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, material);

    // Spread heavily across the X axis to cover ultrawide screens and reduce density
    line.position.x = (Math.random() - 0.5) * 140;
    line.position.y = (Math.random() - 0.5) * 80;
    line.position.z = (Math.random() - 0.5) * 30 - 15;

    line.rotation.x = Math.random() * Math.PI;
    line.rotation.y = Math.random() * Math.PI;

    line.userData = {
        rx: (Math.random() - 0.5) * 0.01,
        ry: (Math.random() - 0.5) * 0.01,
        yVel: Math.random() * 0.02 + 0.01
    };

    scene.add(line);
    cubes.push(line);
}

camera3d.position.z = 20;

function animateBg() {
    requestAnimationFrame(animateBg);

    // Check if menus are visible using the global gameState from game.js
    if (typeof gameState !== 'undefined') {
        if (gameState === 'PLAYING' || gameState === 'DYING') {
            bg3dContainer.style.opacity = '0';
            return;
        } else {
            bg3dContainer.style.opacity = '1';

            // Switch edge color to red on game over, white otherwise
            if (gameState === 'GAMEOVER') {
                material.color.setHex(0xc91515);
            } else {
                material.color.setHex(0xffffff);
            }
        }
    }

    cubes.forEach(cube => {
        cube.rotation.x += cube.userData.rx;
        cube.rotation.y += cube.userData.ry;
        cube.position.y += cube.userData.yVel;
        cube.position.x += Math.sin(Date.now() * 0.001 + cube.position.z) * 0.005;

        // Loop position vertically
        if (cube.position.y > 40) {
            cube.position.y = -40;
            cube.position.x = (Math.random() - 0.5) * 140;
        }
    });

    renderer.render(scene, camera3d);
}

window.addEventListener('resize', () => {
    camera3d.aspect = window.innerWidth / window.innerHeight;
    camera3d.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animateBg();
