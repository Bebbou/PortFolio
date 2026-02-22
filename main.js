import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
const particles = [];
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const particleGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3); // Petits cubes d'écume
const smokeParticles = [];
const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6 });
const smokeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2); // Un peu plus petit que l'écume
// --- CONFIGURATION DU MOTEUR ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });

const pixelRatio = 1.5;
renderer.setSize(window.innerWidth / pixelRatio, window.innerHeight / pixelRatio, false);
document.body.appendChild(renderer.domElement);

let smoothRotation = 0;

// --- OBJETS ---
const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300), 
    new THREE.MeshBasicMaterial({ color: 0x0044ff })
);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// --- CHARGEMENT DU BATEAU (Le S.S. Linebeck !) ---
let boat = null; // On initialise à null pour éviter les erreurs avant le chargement
const loader = new GLTFLoader();

loader.load('boat.glb', (gltf) => {
    boat = gltf.scene;
    boat.position.y = 0.3;
    boat.scale.set(1.5, 1.5, 1.5);
    boat.rotation.y = 180; // Orienter le bateau vers l'avant
    
    // Si ton bateau est trop petit/grand dans Blockbench, ajuste ici :
    // boat.scale.set(1.5, 1.5, 1.5); 
    
    scene.add(boat);
    console.log("Bateau chargé avec succès !");
}, undefined, (error) => {
    console.error("Erreur lors du chargement du fichier .glb : ", error);
});

// --- LUMIÈRES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Lumière globale
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1); // Un "soleil" pour les ombres
sunLight.position.set(5, 10, 7);
scene.add(sunLight);
// --- SYSTÈME D'ÎLES ---
const islands = [];
function createIsland(x, z, color, name, content) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 0.5, 12),
        new THREE.MeshBasicMaterial({ color: color })
    );
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    islands.push({ mesh, name, content: content || "Contenu à venir... ATTETNIOS DJUFRHIEHRGHERUGJOIHPURIGHPEG" });
}

createIsland(20, 20, 0xffcc00, "MES RÉALISATIONS");
createIsland(-25, 40, 0xff00ff, "QUI SUIS-JE ?");

// --- ÉLÉMENTS UI & ÉTATS ---
const dialogBox = document.getElementById('dialog-box');
const islandTitle = document.getElementById('island-name');
const overlay = document.getElementById('transition-overlay');
const projectScene = document.getElementById('project-scene');
const projectTitle = document.getElementById('project-title');
const projectBody = document.getElementById('project-body');
const backBtn = document.getElementById('back-to-sea');

let isExploring = false; 
let currentActiveIsland = null;
const keys = { z: false, s: false, q: false, d: false };
let speed = 0, rotation = 0;

// --- GESTION DES TOUCHES ---
window.addEventListener('keydown', (e) => { 
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = true;
    if (e.key === "Enter" && currentActiveIsland && !isExploring) startTransition();
});
window.addEventListener('keyup', (e) => { 
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = false; 
});

// --- LOGIQUE DE TRANSITION ---
function startTransition() {
    isExploring = true;
    speed = 0;
    overlay.style.opacity = "1";
    setTimeout(() => {
        projectTitle.innerText = currentActiveIsland.name;
        projectBody.innerHTML = `<p>${currentActiveIsland.content}</p>`;
        projectScene.style.display = "block";
        overlay.style.opacity = "0";
    }, 800);
}

backBtn.onclick = () => {
    overlay.style.opacity = "1";
    setTimeout(() => {
        projectScene.style.display = "none";
        overlay.style.opacity = "0";
        isExploring = false;
    }, 800);
};

// --- BOUCLE D'ANIMATION ---
function animate() {
    requestAnimationFrame(animate);
    if (!boat || isExploring) return;
    

    // SÉCURITÉ : Si le bateau n'est pas encore chargé ou si on explore, on ne fait rien
    if (!boat || isExploring) return;
if (Math.random() > 0.8) { // On n'en crée pas à chaque frame pour un effet plus naturel
        createSmoke();
    }
    // 1. Déplacement
    if (keys.q) rotation += 0.015;
    if (keys.d) rotation -= 0.015;
    boat.rotation.y = rotation + 3.14;

    if (keys.z) speed = Math.min(speed + 0.005, 0.09);
    else if (keys.s) speed = Math.max(speed - 0.005, -0.05);
    else speed *= 0.96;

    boat.position.x += Math.sin(rotation) * speed;
    boat.position.z += Math.cos(rotation) * speed;
    if (Math.abs(speed) > 0.02) {
        createWake();
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life -= 0.02; // La particule vieillit
        
        // On la fait rétrécir et s'estomper
        p.scale.set(p.userData.life, p.userData.life, p.userData.life);
        p.material.opacity = p.userData.life;

        // Si elle est morte, on la supprime
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const s = smokeParticles[i];
        
        s.position.y += s.userData.vy; // Elle monte
        s.position.x += s.userData.vx; // Elle dérive un peu
        s.userData.life -= 0.01; // Elle dure plus longtemps que l'écume
        
        // La fumée grossit un peu en montant (comme un vrai nuage)
        const scale = (1.5 - s.userData.life) * 1.2;
        s.scale.set(scale, scale, scale);
        s.material.opacity = s.userData.life;

        if (s.userData.life <= 0) {
            scene.remove(s);
            smokeParticles.splice(i, 1);
        }
    }
    // 2. Caméra dynamique
    smoothRotation = THREE.MathUtils.lerp(smoothRotation, rotation, 0.05);
    const camX = boat.position.x - Math.sin(smoothRotation) * 12;
    const camZ = boat.position.z - Math.cos(smoothRotation) * 12;

    camera.position.set(camX, 7, camZ);
    camera.lookAt(boat.position);

    // 3. Détection des îles
    currentActiveIsland = null;
    islands.forEach(island => {
        if (boat.position.distanceTo(island.mesh.position) < 7) {
            currentActiveIsland = island;
        }
    });

    // 4. UI Update
    dialogBox.style.display = currentActiveIsland ? 'block' : 'none';
    if(currentActiveIsland) islandTitle.innerText = currentActiveIsland.name;

    renderer.render(scene, camera);

    function createWake() {
    // On ne crée de l'écume que si le bateau avance vraiment
    if (Math.abs(speed) < 0.01) return;
    

    const p = new THREE.Mesh(particleGeometry, particleMaterial.clone());
    // Positionner la particule juste derrière le bateau
    // On utilise la rotation du bateau pour trouver l'arrière
    p.position.x = boat.position.x - Math.sin(rotation) * 0.2;
    p.position.z = boat.position.z - Math.cos(rotation) * 0.2;
    p.position.y = 0.2; // Au niveau de l'eau
    p.position.x += (Math.random() - 0.1) * 0.1;
    p.userData.life = 1.0; // Durée de vie de la particule (de 1 à 0)
    scene.add(p);
    particles.push(p);
}
    function createSmoke() {
    const s = new THREE.Mesh(smokeGeometry, smokeMaterial.clone());
    
    // Position de départ : le sommet de la cheminée
    const hauteurCheminee = 1.5; 
    const reculCheminee = 0.5; // Ajuste si ta cheminée est à l'arrière du centre

    s.position.x = boat.position.x - Math.sin(rotation) * reculCheminee;
    s.position.z = boat.position.z - Math.cos(rotation) * reculCheminee;
    s.position.y = boat.position.y + hauteurCheminee;

    // On donne une petite vitesse aléatoire pour que la fumée monte et flotte
    s.userData.vx = (Math.random() - 0.5) * 0.02; // Dérive latérale
    s.userData.vy = 0.02 + Math.random() * 0.02; // Vitesse de montée
    s.userData.life = 1.0;

    scene.add(s);
    smokeParticles.push(s);
}
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / pixelRatio, window.innerHeight / pixelRatio, false);
});