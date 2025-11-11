// Variáveis do jogo
let scene, camera, renderer, player, ground, machine, coins = [], particles = [];
let keys = {}, gameRunning = true;
let playerVelocity = { x: 0, y: 0, z: 0 };

// Sistema de progressão
let playerLevel = 1;
let coinsCarried = 0;
let coinsStored = 0;
let experience = 0;
let maxCarryCapacity = 5;
let playerSpeed = 0.06;
let collectionRange = 1.2;

// NOVO: Raio de Colisão do Jogador
const PLAYER_COLLISION_RADIUS = 0.12; // Baseado no tamanho do personagem

// Constante para a altura de repouso (para consistência)
const RESTING_HEIGHT = 1.5;

// Configurações de nível
const levelRequirements = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// Aumentando o tamanho do mundo em 4x (dobrando a largura e o comprimento)
const worldSize = 300; // Aumenta aqui

let nearMachine = false;

// Variáveis do joystick mobile
let joystickInput = { x: 0, z: 0 };
let joystickActive = false;
const JOYSTICK_DEADZONE = 0.15;
const JOYSTICK_MAX_DISTANCE = 28;

// Variáveis do dash
let isDashing = false;
let dashCooldown = 0;
const DASH_COOLDOWN_TIME = 3000; // 3 segundos
const DASH_DURATION = 200; // 0.2 segundos
const DASH_SPEED_MULTIPLIER = 2; // 4x a velocidade normal

// Adicionando controles de órbita
let controls;

// Variáveis para a animação do personagem Roblox
let leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup;

// NOVO: Array para guardar os zumbis
let zombies = []; // <-- TROCADO: dragons para zombies

// NOVO: Array para as folhas caindo
let leaves = []; // <-- NOVO: Array para as folhas

// NOVO: Posições pré-definidas para os zumbis
const ZOMBIE_SPAWN_POSITIONS = [ // <-- TROCADO: DRAGON para ZOMBIE
    { x: -70, y: 0, z: 70 },
    { x: 70, y: 0, z: 70 },
    { x: -70, y: 0, z: -70 },
    { x: 70, y: 0, z: -70 }
];

// NOVO: Constantes para o comportamento dos zumbis
const ZOMBIE_AGGRO_RANGE = 15; // Distância para começar a perseguir
const ZOMBIE_ATTACK_RANGE = 2.5; // Distância para atacar
const ZOMBIE_SPEED = 0.08; // Velocidade de perseguição (ajustada para ser mais lenta)

// --- NOVO: Variáveis e Estruturas de Dados para Colisões ---
let chickens = [];
let trees = [];
// ===================================================================
// NOVO: Variáveis para o Áudio (Passos) - INÍCIO
// ===================================================================
let listener;
let audioLoader;
let footstepsSound;
let isFootstepsPlaying = false; // Flag para controlar o estado do som
let jumpSound; // <-- NOVO: Variável para o som de pulo
// ===================================================================
// NOVO: Variáveis para o Áudio (Passos) - FIM
// ===================================================================


// Configuração inicial
function init() {
    // Cena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, worldSize * 0.4, worldSize * 1.5);

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20); // Posição inicial da câmera ajustada para uma boa visualização

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.appendChild(renderer.domElement);
    } else {
        // Fallback: adicionar ao body se gameContainer não for encontrado
        document.body.appendChild(renderer.domElement);
    }

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Otimizado
    directionalLight.shadow.mapSize.height = 2048; // Otimizado
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);

    // Criar mundo (Obstáculos primeiro)
    createGround();
    createMachine();        // 1. Máquina (Obstáculo Estático Principal)
    
    spawnGameTrees();       // 2. Árvores (Obstáculos Estáticos)
    spawnZombies();         // 3. Zumbis (Obstáculos Móveis)
    spawnChickens();        // 4. Galinhas (Obstáculos Móveis)
    spawnCoins();           // 5. Moedas (Não são obstáculos)
    
    // --- NOVO: ENCONTRA UMA POSIÇÃO DE INÍCIO VÁLIDA ---
    const startPosition = getValidSpawnPosition(); 
    
    // 6. Cria o personagem na posição validada
    createRobloxCharacter(startPosition); 
    // --- FIM DO NOVO BLOCO ---


    // Controles de órbita para a câmera
    // Verifica se OrbitControls está carregado globalmente
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        // Ajusta o target inicial para a posição inicial validada
        controls.target.set(startPosition.x, startPosition.y, startPosition.z); 
        controls.enableDamping = false; 
        controls.dampingFactor = 0; 
        controls.enablePan = true;
        controls.minDistance = 9;
        controls.maxDistance = 9;
        controls.maxPolarAngle = Math.PI / 2.2; 
        controls.update();
    } else {
        // Se não estiver carregado, a câmera ficará fixa
        console.warn("THREE.OrbitControls não está carregado! A câmera ficará estática. Certifique-se de incluir o script.");
    }

    // ===================================================================
    // NOVO: Configuração do Áudio - INÍCIO
    // ===================================================================
    listener = new THREE.AudioListener();
    camera.add(listener);

    audioLoader = new THREE.AudioLoader();
    footstepsSound = new THREE.Audio(listener);
    jumpSound = new THREE.Audio(listener); // <-- NOVO: Inicializa o objeto de áudio de pulo

    // Carregar o som dos passos
    // Certifique-se de que "passosgame.mp3" está no mesmo diretório do seu HTML ou acessível.
    audioLoader.load('Son_andarGame/passosgame.mp3', function(buffer) {
        footstepsSound.setBuffer(buffer);
        footstepsSound.setLoop(true); // O som toca em loop enquanto o personagem anda
        footstepsSound.setVolume(0.5); // Volume ajustável
        console.log("Som de passos carregado.");
    }, 
    // onProgress callback (Opcional)
    undefined,
    // onError callback
    function (err) {
        console.error( 'Erro ao carregar passosgame.mp3:', err );
    });
    
    // NOVO: Carregar o som de pulo
    audioLoader.load('Son_puloGame/pulo_son.mp3', function(buffer) {
        jumpSound.setBuffer(buffer);
        jumpSound.setLoop(false); // Não toca em loop
        jumpSound.setVolume(0.8); // Volume ajustável
        console.log("Som de pulo carregado.");
    }, 
    // onProgress callback (Opcional)
    undefined,
    // onError callback
    function (err) {
        console.error( 'Erro ao carregar pulo_son.mp3:', err );
    });
    // ===================================================================
    // NOVO: Configuração do Áudio - FIM
    // ===================================================================

    // Event listeners
    setupControls();

    // Inicializar UI
    updateUI();

    // Iniciar loop do jogo
    animate();
}

function createGround() {
    // Chão principal
    const groundGeometry = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x228B22,
        transparent: true,
        opacity: 0.9
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar detalhes ao chão
    createGroundDetails();

    // Bordas do mundo
    createWorldBorders();
}

function createGroundDetails() {
    // OTIMIZAÇÃO: Usando InstancedMesh para grama, flores e pedras
    const grassCount = 250; // Quantidade de grama 
    const flowerCount = 50; // Qusntidade de Flores
    const rockCount = 380; // Quantidade dw pedras
    const groundArea = worldSize * 1.8;

    // Grama
    const grassGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
    const grassMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const grassInstancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
    const grassMatrix = new THREE.Matrix4();
    const grassColor = new THREE.Color();
    for (let i = 0; i < grassCount; i++) {
        grassMatrix.makeRotationY(Math.random() * Math.PI * 2);
        grassMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.25,
            (Math.random() - 0.5) * groundArea
        );
        grassInstancedMesh.setMatrixAt(i, grassMatrix);
        grassInstancedMesh.setColorAt(i, grassColor.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.3));
    }
    grassInstancedMesh.castShadow = true;
    scene.add(grassInstancedMesh);

    // Flores
    const flowerGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const flowerMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const flowerInstancedMesh = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
    const flowerMatrix = new THREE.Matrix4();
    const flowerColor = new THREE.Color();
    for (let i = 0; i < flowerCount; i++) {
        flowerMatrix.makeTranslation(
            (Math.random() - 0.5) * groundArea,
            0.08,
            (Math.random() - 0.5) * groundArea
        );
        flowerInstancedMesh.setMatrixAt(i, flowerMatrix);
        flowerInstancedMesh.setColorAt(i, flowerColor.setHSL(Math.random(), 0.8, 0.7));
    }
    scene.add(flowerInstancedMesh);

    // Pedras
    const rockGeometry = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969, flatShading: true });
    const rockInstancedMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
    const rockMatrix = new THREE.Matrix4();
    for (let i = 0; i < rockCount; i++) {
        rockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        rockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.2,
            (Math.random() - 0.5) * groundArea
        );
        rockInstancedMesh.setMatrixAt(i, rockMatrix);
    }
    rockInstancedMesh.castShadow = true;
    scene.add(rockInstancedMesh);
}

function createWorldBorders() {
    const borderHeight = 3;
    const borderWidth = 0.5;
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    // Bordas
    const borders = [
        { x: 0, z: worldSize, w: worldSize * 2, h: borderWidth },
        { x: 0, z: -worldSize, w: worldSize * 2, h: borderWidth },
        { x: worldSize, z: 0, w: borderWidth, h: worldSize * 2 },
        { x: -worldSize, z: 0, w: borderWidth, h: worldSize * 2 }
    ];

    borders.forEach(border => {
        const geometry = new THREE.BoxGeometry(border.w, borderHeight, border.h);
        const mesh = new THREE.Mesh(geometry, borderMaterial);
        mesh.position.set(border.x, borderHeight / 2, border.z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
    });
}

// NOVO PERSONAGEM: Agora aceita a posição inicial
function createRobloxCharacter(startPosition) {
    player = new THREE.Group();
    // DEFINE A POSIÇÃO INICIAL AQUI
    player.position.copy(startPosition); 
    scene.add(player);

    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xF1C27D });
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0x4444aa });
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x2B1B0E });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 });

    // Cabeça mais robusta e arredondada
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    player.add(head);

    // Cabelo mais volumoso e detalhado
    const hairGeometry = new THREE.BoxGeometry(0.85, 0.4, 0.85);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 2.15, 0);
    hair.castShadow = true;

    // Adicionar mechas de cabelo laterais
    const sideHair1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), hairMaterial);
    sideHair1.position.set(-0.45, 2.0, 0.2);
    player.add(sideHair1);

    const sideHair2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), hairMaterial);
    sideHair2.position.set(0.45, 2.0, 0.2);
    player.add(sideHair2);

    player.add(hair);

    // Olhos maiores e mais expressivos
    const eyeGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.04);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.18, 1.82, 0.41);
    player.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.18, 1.82, 0.41);
    player.add(rightEye);

    // Boca mais detalhada
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.03), mouthMaterial);
    mouth.position.set(0, 1.58, 0.41);
    player.add(mouth);

    // Corpo mais robusto e musculoso
    const bodyGeometry = new THREE.BoxGeometry(1.1, 1.3, 0.5);
    const body = new THREE.Mesh(bodyGeometry, shirtMaterial);
    body.position.set(0, 0.9, 0);
    body.castShadow = true;

    // Adicionar detalhes do peito
    const chestDetail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.52), new THREE.MeshLambertMaterial({ color: 0x3333aa }));
    chestDetail.position.set(0, 1.1, 0);
    player.add(chestDetail);

    player.add(body);

    // Braços mais musculosos e detalhados
    const armGeometry = new THREE.BoxGeometry(0.35, 1.1, 0.35);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.55;
    leftArm.castShadow = true;

    // Ombro mais robusto
    const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), armMaterial);
    leftShoulder.position.set(0, 0.1, 0);
    leftArmGroup.add(leftShoulder);

    // Antebraço definido
    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), skinMaterial);
    leftForearm.position.set(0, -0.8, 0);
    leftArmGroup.add(leftForearm);

    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.75, 1.6, 0);
    player.add(leftArmGroup);

    rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.y = -0.55;
    rightArm.castShadow = true;

    const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), armMaterial);
    rightShoulder.position.set(0, 0.1, 0);
    rightArmGroup.add(rightShoulder);

    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), skinMaterial);
    rightForearm.position.set(0, -0.8, 0);
    rightArmGroup.add(rightForearm);

    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(0.75, 1.6, 0);
    player.add(rightArmGroup);

    // Pernas mais robustas e musculosas
    const legGeometry = new THREE.BoxGeometry(0.45, 1.4, 0.45);

    leftLegGroup = new THREE.Group();
    const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    leftLeg.position.y = -0.7;

    // Coxa mais definida
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), pantsMaterial);
    leftThigh.position.set(0, -0.1, 0);
    leftLegGroup.add(leftThigh);

    // Panturrilha
    const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), pantsMaterial);
    leftCalf.position.set(0, -1.0, 0);
    leftLegGroup.add(leftCalf);

    // Pé mais robusto
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    leftFoot.position.set(0, -1.5, 0.1);
    leftLegGroup.add(leftFoot);

    leftLegGroup.add(leftLeg);
    leftLegGroup.position.set(-0.3, 0.25, 0);
    player.add(leftLegGroup);

    rightLegGroup = new THREE.Group();
    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    rightLeg.position.y = -0.7;

    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), pantsMaterial);
    rightThigh.position.set(0, -0.1, 0);
    rightLegGroup.add(rightThigh);

    const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), pantsMaterial);
    rightCalf.position.set(0, -1.0, 0);
    rightLegGroup.add(rightCalf);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rightFoot.position.set(0, -1.5, 0.1);
    rightLegGroup.add(rightFoot);

    rightLegGroup.add(rightLeg);
    rightLegGroup.position.set(0.3, 0.25, 0);
    player.add(rightLegGroup);
}

// *******************************************************************
// NOVO: FUNÇÃO PARA ENCONTRAR UMA POSIÇÃO INICIAL VÁLIDA
// *******************************************************************
/**
 * Encontra uma posição inicial aleatória que não colide com nenhum objeto do mapa.
 * Requer que todos os obstáculos (machine, trees, zombies, chickens) já tenham sido criados.
 * @returns {THREE.Vector3} Uma posição inicial válida para o jogador.
 */
function getValidSpawnPosition() {
    const worldRadius = worldSize * 0.8; // Área para spawn dentro dos limites do mundo
    let validPosition = new THREE.Vector3();
    let collision = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 500;

    // A posição Y é fixada pela constante global RESTING_HEIGHT (1.5)
    
    while (collision && attempts < MAX_ATTEMPTS) {
        // 1. Gera uma posição aleatória dentro dos limites do mundo
        validPosition.x = (Math.random() - 0.5) * worldRadius;
        validPosition.z = (Math.random() - 0.5) * worldRadius;
        validPosition.y = RESTING_HEIGHT; // Fixa a altura

        // 2. Verifica a colisão com a nova posição
        collision = checkCollisions(validPosition);

        attempts++;
    }

    if (collision) {
        // Fallback: Se não encontrar uma posição válida, usa (5, 1.5, 5) que é um local relativamente seguro.
        console.warn("Não foi possível encontrar uma posição de spawn sem colisão. Usando fallback (5, 1.5, 5).");
        return new THREE.Vector3(5, RESTING_HEIGHT, 5);
    }
    
    console.log(`Posição de spawn válida encontrada em ${attempts} tentativas: (${validPosition.x.toFixed(2)}, ${validPosition.z.toFixed(2)})`);
    return validPosition;
}
// *******************************************************************
// FIM: FUNÇÃO PARA ENCONTRAR UMA POSIÇÃO INICIAL VÁLIDA
// *******************************************************************

function createMachine() {
    machine = new THREE.Group();
    machine.position.set(0, 0, 0);
    scene.add(machine);

    // Base da máquina
    const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    machine.add(base);

    // Corpo principal
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    machine.add(body);

    // Topo da máquina
    const topGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x00BFFF });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 4.25;
    top.castShadow = true;
    machine.add(top);

    // Slot para moedas
    const slotGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3);
    const slotMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const slot = new THREE.Mesh(slotGeometry, slotMaterial);
    slot.position.set(0, 3, 1.6);
    machine.add(slot);

    // Tela da máquina
    const screenGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMaterial = new THREE.MeshLambertMaterial({
        color: 0x00FF00,
        emissive: 0x002200
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 2.5, 1.85);
    machine.add(screen);

    // Luzes da máquina
    for (let i = 0; i < 4; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({
            color: i % 2 === 0 ? 0xFF0000 : 0x00FF00,
            emissive: i % 2 === 0 ? 0x330000 : 0x003300
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);

        const angle = (i / 4) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 1.2,
            4.5,
            Math.sin(angle) * 1.2
        );
        machine.add(light);
        light.userData = { isLight: true, originalEmissive: light.material.emissive.clone() };
    }

    // Área de detecção da máquina
    machine.userData = { 
        interactionRadius: 3, 
        collisionRadius: 2.5 // Raio de colisão para a máquina
    };
}


// Funçao para criar e espalhar as moedas

function spawnCoins() {
    // OTIMIZAÇÃO: Limita o número de moedas ativas a 150 para melhor performance
    const coinsToSpawn = Math.min(150, 150 + playerLevel * 20);

    for (let i = coins.length; i < coinsToSpawn; i++) {
        spawnCoin();
    }
}

function spawnCoin() {
    const coinGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    const coinMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFD700,
        emissive: 0x332200
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);

    // Posição aleatória longe da máquina
    let x, z;
    do {
        x = (Math.random() - 0.5) * worldSize * 1.8;
        z = (Math.random() - 0.5) * worldSize * 1.8;
    } while (Math.sqrt(x * x + z * z) < 8); // Manter distância da máquina

    coin.position.set(x, 0.8, z);
    coin.castShadow = true;
    coin.userData = {
        collected: false,
        rotationSpeed: 0.08,
        floatOffset: Math.random() * Math.PI * 2
    };

    scene.add(coin);
    coins.push(coin);

    // Efeito de brilho
    const glowGeometry = new THREE.RingGeometry(0.5, 0.7, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(coin.position);
    glow.position.y = 0.1;
    glow.rotation.x = -Math.PI / 2;
    scene.add(glow);
    coin.userData.glow = glow;
}

// --- INÍCIO DO CÓDIGO DA ÁRVORE SIMPLIFICADA (ATUALIZADO) ---

// Função para criar cilindro (tronco)
function createSimpleBranch(radius, height, color = 0x654321, segments = 8) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        flatShading: true
    });
    const branch = new THREE.Mesh(geometry, material);
    branch.castShadow = true;
    return branch;
}

// Função para criar a folhagem da árvore (usando um cone)
function createSimpleFoliage(radius, height, color, segments = 8) {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        flatShading: true
    });
    const foliage = new THREE.Mesh(geometry, material);
    foliage.castShadow = true;
    return foliage;
}

// NOVO: Cores de Outono para a Folhagem
const AUTUMN_COLORS = [
    new THREE.Color(0x38761D), // Verde Escuro
    new THREE.Color(0x93C47D), // Verde Claro
    new THREE.Color(0xFFA500), // Laranja
    new THREE.Color(0xFF6347), // Vermelho Coral
    new THREE.Color(0xFFD700)  // Dourado
];

// Função para criar uma única árvore de jogo bonita (melhorada)
function createGameTree() {
    const treeGroup = new THREE.Group();

    // Tronco principal: um cilindro simples
    const trunkHeight = 10;
    const trunk = createSimpleBranch(1.5, trunkHeight);
    trunk.position.y = trunkHeight / 2;
    treeGroup.add(trunk);

    // Selecionar 3 cores aleatórias para as camadas
    const colors = AUTUMN_COLORS.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Cone Inferior
    const bottomCone = createSimpleFoliage(7, 12, colors[0]);
    bottomCone.position.y = trunkHeight - 2;
    treeGroup.add(bottomCone);

    // Cone do Meio
    const middleCone = createSimpleFoliage(5, 9, colors[1]);
    middleCone.position.y = trunkHeight + 4;
    treeGroup.add(middleCone);
    
    // Cone Superior
    const topCone = createSimpleFoliage(3, 6, colors[2]);
    topCone.position.y = trunkHeight + 8;
    treeGroup.add(topCone);

    // Salva a posição e o raio da árvore para spawn de folhas E COLISÃO
    treeGroup.userData.foliageBaseY = trunkHeight + 8; // Altura máxima para as folhas
    treeGroup.userData.foliageMaxRadius = 7; 
    treeGroup.userData.collisionRadius = 2.5; // NOVO: Raio de colisão para a árvore
    
    return treeGroup;
}

// Função para espalhar as árvores no mapa
function spawnGameTrees() {
    const numTrees = 20; 
    const worldRadius = worldSize * 0.85;

    // Garante que o array está limpo antes de popular novamente (boa prática)
    trees.forEach(tree => scene.remove(tree));
    trees = [];

    for (let i = 0; i < numTrees; i++) {
        const tree = createGameTree();

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * worldRadius;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        tree.position.set(x, 0, z);

        // Variação de escala e rotação
        const scale = 0.7 + Math.random() * 0.6;
        tree.scale.set(scale, scale, scale);
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        // Ajusta o raio de colisão da árvore com base na escala
        tree.userData.scaledCollisionRadius = tree.userData.collisionRadius * scale;

        scene.add(tree);
        trees.push(tree); // NOVO: Adiciona a árvore à lista para verificação de colisão
    }
}
// --- FIM DO CÓDIGO DA ÁRVORE SIMPLIFICADA (ATUALIZADO) ---

// --- NOVO: LÓGICA DE FOLHAS CAINDO ---

// Função para criar uma partícula de folha
function createLeafParticle(tree) {
    // A folha herda a cor aleatória de uma das cores de outono
    const leafColor = AUTUMN_COLORS[Math.floor(Math.random() * AUTUMN_COLORS.length)];
    const particleGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: leafColor,
        side: THREE.DoubleSide,
        transparent: true
    });
    const leaf = new THREE.Mesh(particleGeometry, particleMaterial);

    // Posição inicial no topo da árvore (e um pouco fora para o efeito de vento)
    const treeScale = tree.scale.x;
    const radius = Math.random() * tree.userData.foliageMaxRadius * treeScale;
    const angle = Math.random() * Math.PI * 2;

    leaf.position.set(
        tree.position.x + Math.cos(angle) * radius,
        tree.userData.foliageBaseY * treeScale, // Começa na altura do topo
        tree.position.z + Math.sin(angle) * radius
    );
    
    // Configuração de animação
    leaf.userData = {
        speedY: (Math.random() * 0.01) + 0.015, // Velocidade de queda lenta
        windX: (Math.random() - 0.5) * 0.005, // Efeito de vento horizontal
        windZ: (Math.random() - 0.5) * 0.005,
        rotationSpeed: (Math.random() * 0.1) + 0.05, // Velocidade de rotação
        treeReference: tree // Referência à árvore de origem
    };

    scene.add(leaf);
    leaves.push(leaf);
}

// Função para atualizar as folhas caindo
function updateLeaves() {
    // Manter um número constante de folhas ativas para um fluxo contínuo
    const MAX_LEAVES = 300;
    if (leaves.length < MAX_LEAVES && trees.length > 0) {
        // Gera uma folha aleatoriamente a partir de uma árvore
        const randomTree = trees[Math.floor(Math.random() * trees.length)];
        createLeafParticle(randomTree);
    }
    
    // Atualiza a posição e rotação das folhas
    leaves.forEach((leaf, index) => {
        // Animação de queda
        leaf.position.y -= leaf.userData.speedY;
        
        // Simulação de vento (movimento sutil horizontal)
        leaf.position.x += leaf.userData.windX + Math.sin(Date.now() * 0.005 + index) * 0.005;
        leaf.position.z += leaf.userData.windZ + Math.cos(Date.now() * 0.005 + index) * 0.005;
        
        // Animação de rotação (caindo em espiral)
        leaf.rotation.z += leaf.userData.rotationSpeed;
        leaf.rotation.x = Math.sin(Date.now() * 0.008 + index) * Math.PI / 4;
        
        // Verifica se a folha chegou ao chão (y <= 0)
        if (leaf.position.y <= 0) {
            scene.remove(leaf);
            leaves.splice(index, 1);
        }
    });
}
// --- FIM DA LÓGICA DE FOLHAS CAINDO ---


function setupControls() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;

        // Interação com a máquina: AGORA USA 'KeyE' (E)
        if (event.code === 'KeyE' && nearMachine && coinsCarried > 0) {
            depositCoins();
        }

        // Iniciar o dash
        if (event.code === 'ShiftLeft' && !isDashing && dashCooldown <= 0) {
            startDash();
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Controles mobile
    setupMobileControls();

    window.addEventListener('resize', onWindowResize);
}

function setupMobileControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const jumpButton = document.getElementById('jumpButton');
    const dashButton = document.getElementById('dashButton');
    const storeButton = document.getElementById('storeButton'); // NOVO: Referência ao botão de guardar
    
    // SÓ ADICIONA LISTENERS SE OS ELEMENTOS EXISTIREM
    if (!joystick || !joystickKnob || !jumpButton || !dashButton) return;

    function getTouchPos(e) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const touch = e.touches[0] || e.changedTouches[0];

        return {
            x: touch.clientX - centerX,
            y: touch.clientY - centerY
        };
    }

    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        // NOVO CÓDIGO: Verifica se o toque está na metade esquerda da tela ANTES de ativar o joystick
        if (touch.clientX < window.innerWidth / 2) {
            joystickActive = true;
        } else {
            // Se o toque estiver no lado direito, ignora a ativação do joystick.
            joystickActive = false;
        }
    });

    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;

        const pos = getTouchPos(e);
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        let finalX = pos.x;
        let finalY = pos.y;

        if (distance > JOYSTICK_MAX_DISTANCE) {
            const angle = Math.atan2(pos.y, pos.x);
            finalX = Math.cos(angle) * JOYSTICK_MAX_DISTANCE;
            finalY = Math.sin(angle) * JOYSTICK_MAX_DISTANCE;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;

        const normalizedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE) / JOYSTICK_MAX_DISTANCE;

        if (normalizedDistance > JOYSTICK_DEADZONE) {
            const adjustedDistance = (normalizedDistance - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
            const angle = Math.atan2(finalY, finalX);
            joystickInput.x = Math.cos(angle) * adjustedDistance;
            joystickInput.z = Math.sin(angle) * adjustedDistance;
        } else {
            joystickInput.x = 0;
            joystickInput.z = 0;
        }
    });

    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickInput = { x: 0, z: 0 };
    });

    joystick.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickInput = { x: 0, z: 0 };
    });

    // CORREÇÃO: Pular não deve depositar moedas!
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true; // Apenas ativa a tecla Space para pular
    });

    jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });

    // NOVO: Listener dedicado para o botão de guardar moedas
    if (storeButton) {
        storeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (nearMachine && coinsCarried > 0) {
                depositCoins();
            }
        });
    }

    dashButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!isDashing && dashCooldown <= 0) {
            startDash();
        }
    });
}

// *******************************************************************
// FUNÇÃO DE COLISÃO DO JOGADOR - NOVO
// *******************************************************************
/**
 * Verifica se uma determinada posição do jogador colide com qualquer objeto do mundo.
 * @param {THREE.Vector3} newPosition A posição futura (x, y, z) do jogador.
 * @returns {boolean} Retorna true se houver colisão, false caso contrário.
 */
function checkCollisions(newPosition) {
    const playerXZ = new THREE.Vector2(newPosition.x, newPosition.z);
    
    // 1. Colisão com a Máquina (Depósito)
    if (machine && machine.userData.collisionRadius) {
        const machineXZ = new THREE.Vector2(machine.position.x, machine.position.z);
        const distance = playerXZ.distanceTo(machineXZ);
        const totalRadius = PLAYER_COLLISION_RADIUS + machine.userData.collisionRadius;
        
        if (distance < totalRadius) {
            // Colisão detectada com a máquina.
            return true;
        }
    }

    // 2. Colisão com as Árvores
    for (const tree of trees) {
        if (tree.userData.scaledCollisionRadius) {
            const treeXZ = new THREE.Vector2(tree.position.x, tree.position.z);
            const distance = playerXZ.distanceTo(treeXZ);
            // scaledCollisionRadius é o raio da árvore já ajustado pela escala.
            const totalRadius = PLAYER_COLLISION_RADIUS + tree.userData.scaledCollisionRadius;
            
            if (distance < totalRadius) {
                // Colisão detectada com uma árvore.
                return true;
            }
        }
    }
    
    // 3. Colisão com Zumbis (e outros NPCs móveis)
    // Usamos um raio menor para os zumbis, apenas para evitar atravessá-los.
    const NPC_COLLISION_RADIUS = 0.5; 
    
    // Zumbis
    for (const zombie of zombies) {
        if (zombie.userData.isZombie) {
            const zombieXZ = new THREE.Vector2(zombie.position.x, zombie.position.z);
            const distance = playerXZ.distanceTo(zombieXZ);
            const totalRadius = PLAYER_COLLISION_RADIUS + NPC_COLLISION_RADIUS;
            
            if (distance < totalRadius) {
                // Colisão detectada com um zumbi.
                return true;
            }
        }
    }
    
    // Galinhas
    for (const chicken of chickens) {
        if (chicken.userData.isChicken) {
            const chickenXZ = new THREE.Vector2(chicken.position.x, chicken.position.z);
            const distance = playerXZ.distanceTo(chickenXZ);
            const totalRadius = PLAYER_COLLISION_RADIUS + NPC_COLLISION_RADIUS;
            
            if (distance < totalRadius) {
                // Colisão detectada com uma galinha.
                return true;
            }
        }
    }
    


    return false; // Nenhuma colisão
}


// *******************************************************************
// FUNÇÃO updatePlayer() CORRIGIDA E ATUALIZADA COM LÓGICA DE SOM E COLISÃO
// *******************************************************************
function updatePlayer() {
    if (!gameRunning) return;

    const jumpPower = 0.35;
    const gravity = -0.025; 
    let friction = isDashing ? 0.92 : 0.85; 

    // Condição para estar no chão: a posição Y é menor ou igual à altura de repouso (RESTING_HEIGHT global).
    const onGround = player.position.y <= RESTING_HEIGHT; 

    // Criar um vetor de movimento
    let moveDirection = new THREE.Vector3(0, 0, 0);

    // Movimento horizontal - Teclado
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveDirection.z = -1;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveDirection.z = 1;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        moveDirection.x = -1;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        moveDirection.x = 1;
    }

    // Movimento horizontal - Joystick mobile
    if (Math.abs(joystickInput.x) > 0 || Math.abs(joystickInput.z) > 0) {
        moveDirection.x = joystickInput.x;
        moveDirection.z = joystickInput.z;
    }

    // Velocidade atual do jogador
    let currentSpeed = playerSpeed;

    // Dar boost lateral
    if (isDashing) {
        currentSpeed *= DASH_SPEED_MULTIPLIER;
        if (Math.abs(moveDirection.x) > 0.1) {
            currentSpeed *= 1.3; // 30% mais rápido só para os lados
        }
    }

    // Normalizar o vetor de direção para movimento consistente
    if (moveDirection.length() > 0) {
        moveDirection.normalize();

        // Aplicar a rotação da câmera ao movimento do jogador
        // Verifica se 'controls' foi inicializado
        const angle = controls ? controls.getAzimuthalAngle() : 0;
        const tempVector = new THREE.Vector3(moveDirection.x, 0, moveDirection.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        // Aplica a velocidade atual (incluindo o dash)
        playerVelocity.x += tempVector.x * currentSpeed;
        playerVelocity.z += tempVector.z * currentSpeed;

        // Rotacionar o personagem para a direção do movimento
        const targetRotation = Math.atan2(tempVector.x, tempVector.z);
        // Interpolar a rotação mais devagar
        let rotationSmoothness = isDashing ? 0.20 : 0.30;
        player.rotation.y += (targetRotation - player.rotation.y) * rotationSmoothness;
    }

    // Pulo
    if (keys['Space'] && onGround) {
        playerVelocity.y = jumpPower;
        // Impedir que o pulo seja acionado em loop mantendo a tecla pressionada
        keys['Space'] = false; 
        
        // NOVO: Toca o som de pulo
        if (jumpSound && jumpSound.buffer) {
            if (!jumpSound.isPlaying) { 
                jumpSound.play();
            }
        }
    }

    // Aplicar gravidade
    if (!onGround || playerVelocity.y > 0) { // Se não estiver no chão OU estiver subindo
        playerVelocity.y += gravity;
    } 
    
    // CÁLCULO DA NOVA POSIÇÃO
    const newPosition = player.position.clone();
    newPosition.x += playerVelocity.x;
    newPosition.y += playerVelocity.y;
    newPosition.z += playerVelocity.z;
    
    // **************** NOVO: VERIFICAÇÃO DE COLISÃO HORIZONTAL ****************
    const newPositionX = player.position.clone().setX(newPosition.x);
    const newPositionZ = player.position.clone().setZ(newPosition.z);

    if (checkCollisions(newPositionX)) {
        playerVelocity.x = 0; // Se colidir na direção X, zera a velocidade X
    } else {
        player.position.x = newPosition.x; // Se não colidir, move em X
    }

    if (checkCollisions(newPositionZ)) {
        playerVelocity.z = 0; // Se colidir na direção Z, zera a velocidade Z
    } else {
        player.position.z = newPosition.z; // Se não colidir, move em Z
    }
    // **************** FIM: VERIFICAÇÃO DE COLISÃO HORIZONTAL ****************
    
    // Aplica a posição vertical (a gravidade e o pulo não colidem com os objetos)
    player.position.y = newPosition.y;

    // Colisão com o chão (CORREÇÃO APLICADA AQUI)
    if (player.position.y < RESTING_HEIGHT) {
        playerVelocity.y = 0; // Zera a velocidade vertical
        player.position.y = RESTING_HEIGHT; // Fixa na altura de repouso
    }


    // Aplicar fricção (após o cálculo da velocidade de movimento)
    playerVelocity.x *= friction;
    playerVelocity.z *= friction;

    // Garantir que o player não saia do mapa (Colisão com a borda)
    const halfSize = worldSize - 1.5;
    player.position.x = Math.max(-halfSize, Math.min(halfSize, player.position.x));
    player.position.z = Math.max(-halfSize, Math.min(halfSize, player.position.z));
    
    
    const isMoving = moveDirection.length() > 0;
    const isAirborne = !onGround;
    
    // ===================================================================
    // NOVO: Lógica de Som de Passos - INÍCIO
    // ===================================================================
    if (footstepsSound && footstepsSound.buffer) { 
        // Condição para Tocar: Está se movendo E está no chão E o som não está tocando
        if (isMoving && onGround && !isFootstepsPlaying) {
            if (!footstepsSound.isPlaying) { 
                 // Importante: .play() só funcionará se houver um gesto de usuário prévio no navegador (toque na tela).
                 footstepsSound.play();
            }
            isFootstepsPlaying = true;
        } 
        // Condição para Parar: Parou de se mover OU está no ar E o som está tocando
        else if ((!isMoving || !onGround) && isFootstepsPlaying) {
            footstepsSound.pause(); // Pausa o som para poder recomeçar do início quando voltar a andar.
            isFootstepsPlaying = false;
        }
    }
    // ===================================================================
    // NOVO: Lógica de Som de Passos - FIM
    // ===================================================================

    // ===================================================================
    // NOVO: Lógica de Animação de Pulo/Corrida/Parado
    // ===================================================================
    
    // Prioridade de Animação: 1. Aéreo > 2. Corrida > 3. Parado
    
    if (isAirborne) {
        // ANIMAÇÃO DE PULO: Braços e Pernas em posição de ação
        const jumpRotation = 0.6; // Rotação para os braços (para cima/trás)
        const legTuck = 0.3;      // Rotação para as pernas (levemente dobradas)

        // Braços (para cima/trás para a pose de pulo)
        if(leftArmGroup) leftArmGroup.rotation.x = -jumpRotation;
        if(rightArmGroup) rightArmGroup.rotation.x = -jumpRotation;
        
        // Pernas (levemente dobradas ou para trás)
        if(leftLegGroup) leftLegGroup.rotation.x = legTuck;
        if(rightLegGroup) rightLegGroup.rotation.x = legTuck;
        
    } else if (isMoving) {
        // ANIMAÇÃO DE CORRIDA: Movimento de balanço
        const swing = Math.sin(Date.now() * 0.015 * (isDashing ? 2 : 1)) * 0.6;
        
        if(leftArmGroup) leftArmGroup.rotation.x = swing;
        if(rightArmGroup) rightArmGroup.rotation.x = -swing;
        if(leftLegGroup) leftLegGroup.rotation.x = -swing;
        if(rightLegGroup) rightLegGroup.rotation.x = swing;

    } else {
        // Posição de descanso (Idle)
        if(leftArmGroup) leftArmGroup.rotation.x = 0;
        if(rightArmGroup) rightArmGroup.rotation.x = 0;
        if(leftLegGroup) leftLegGroup.rotation.x = 0;
        if(rightLegGroup) rightLegGroup.rotation.x = 0;
    }
    // ===================================================================

    // Animação sutil de respiração (mantida)
    if (player) {
        player.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.02;
    }
}
// *******************************************************************
// FIM DA FUNÇÃO updatePlayer() CORRIGIDA E ATUALIZADA
// *******************************************************************

function updateCoins() {
    // Coleta de moedas
    coins.forEach((coin, index) => {
        if (coin.userData.collected) return;

        // Animação de flutuação e rotação
        coin.rotation.y += coin.userData.rotationSpeed;
        coin.position.y = 0.8 + Math.sin(Date.now() * 0.003 + coin.userData.floatOffset) * 0.2;
        
        // Atualiza a posição do brilho
        coin.userData.glow.position.copy(coin.position);
        coin.userData.glow.position.y = 0.1;

        // Distância entre a moeda e o player (só no plano XZ)
        const distance = player.position.clone().setY(coin.position.y).distanceTo(coin.position);

        if (distance < collectionRange && coinsCarried < maxCarryCapacity) {
            // Inicia o efeito de atração
            const attractSpeed = 0.05;
            coin.position.lerp(player.position, attractSpeed);

            // Se estiver muito perto, coleta
            if (distance < 0.5) {
                collectCoin(coin, index);
            }
        }
    });
}

function collectCoin(coin, index) {
    if (coin.userData.collected) return;

    coin.userData.collected = true;
    coinsCarried++;
    
    // Efeito de partícula (opcional, mas bom)
    createCollectParticle(coin.position);

    // Remove do mundo
    scene.remove(coin.userData.glow);
    scene.remove(coin);
    coins.splice(index, 1);
    
    updateUI();
    
    // Recriar moeda após um pequeno atraso para manter o limite de moedas
    setTimeout(spawnCoin, 1000); // 1 segundo para respawn
}

function depositCoins() {
    if (coinsCarried > 0) {
        const deposited = coinsCarried;
        coinsStored += deposited;
        experience += deposited;
        coinsCarried = 0;
        
        // Efeito de partículas de depósito
        createDepositParticles(machine.position);

        // Nivelamento
        checkLevelUp();
        
        updateUI();
    }
}

function createCollectParticle(position) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 1 });
    
    for (let i = 0; i < 5; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1 + 0.05,
                (Math.random() - 0.5) * 0.1
            ),
            life: 30, // 30 frames
            originalOpacity: particle.material.opacity
        };
        
        scene.add(particle);
        particles.push(particle);
    }
}

function createDepositParticles(position) {
    const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 1 });
    
    for (let i = 0; i < 15; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        particle.position.y = 3.5; // Altura da tela da máquina
        
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                Math.random() * 0.05 + 0.01,
                (Math.random() - 0.5) * 0.05
            ),
            life: 60,
            originalOpacity: particle.material.opacity
        };
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Efeito de luz na máquina
    machine.children.forEach(child => {
        if (child.userData.isLight) {
            child.material.emissive.setHex(0xFFFFFF);
            setTimeout(() => {
                child.material.emissive.copy(child.userData.originalEmissive);
            }, 300);
        }
    });
}

function updateParticles() {
    particles.forEach((particle, index) => {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.005; // Gravidade nas partículas

        particle.userData.life--;
        particle.material.opacity = particle.userData.originalOpacity * (particle.userData.life / 30); // Diminui opacidade

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(index, 1);
        }
    });
}

function checkLevelUp() {
    if (playerLevel < levelRequirements.length && experience >= levelRequirements[playerLevel]) {
        playerLevel++;
        maxCarryCapacity += 3; // Aumenta a capacidade de carga
        playerSpeed += 0.005; // Aumenta a velocidade
        collectionRange += 0.05; // Aumenta o raio de coleta

        // Efeito visual de level up (máquina explode em partículas?)
        createDepositParticles(machine.position); // Reutiliza partículas
        
        // Alerta na UI
        const alert = document.getElementById('levelAlert');
        if (alert) {
            alert.textContent = `LEVEL UP! Você é agora Level ${playerLevel}!`;
            alert.classList.add('show');
            setTimeout(() => { alert.classList.remove('show'); }, 3000);
        }
    }
}

// --- NOVO: LÓGICA DE ZUMBIS (SIMPLES) ---

function createZombie() {
    const zombieGroup = new THREE.Group();
    
    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0x38761D }); // Pele verde
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 }); // Camisa rasgada
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x1C4587 }); // Calça azul
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    // Cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMaterial);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    zombieGroup.add(head);

    // Olhos
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.02);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.71, 0.36);
    zombieGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.71, 0.36);
    zombieGroup.add(rightEye);
    
    // Corpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.4), shirtMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    zombieGroup.add(body);

    // Braços (simples)
    const armGeometry = new THREE.BoxGeometry(0.2, 1.0, 0.2);
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    leftArm.position.set(-0.55, 1.5, 0);
    leftArm.castShadow = true;
    zombieGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    rightArm.position.set(0.55, 1.5, 0);
    rightArm.castShadow = true;
    zombieGroup.add(rightArm);

    // Pernas (simples)
    const legGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
    const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    leftLeg.position.set(-0.25, 0.2, 0);
    zombieGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    rightLeg.position.set(0.25, 0.2, 0);
    zombieGroup.add(rightLeg);
    
    zombieGroup.position.y = 0.55; // Ajuste para ficar no chão
    zombieGroup.userData.health = 100; // Vida do zumbi
    zombieGroup.userData.isZombie = true;
    zombieGroup.userData.armTimer = Math.random() * Math.PI * 2; // Para oscilação dos braços
    zombieGroup.userData.collisionRadius = 0.4; // NOVO: Raio de colisão do zumbi
    
    return zombieGroup;
}

function spawnZombies() {
    // Garante que haja um zumbi em cada posição pré-definida
    ZOMBIE_SPAWN_POSITIONS.forEach((pos, index) => {
        if (!zombies[index]) {
            const zombie = createZombie();
            zombie.position.set(pos.x, 0, pos.z);
            scene.add(zombie);
            zombies[index] = zombie;
        }
    });
}

function updateZombies() {
    zombies.forEach((zombie, index) => {
        if (!zombie.userData.isZombie) return;
        
        // Distância do player (apenas no plano XZ)
        const playerXZ = player.position.clone().setY(zombie.position.y);
        const distanceToPlayer = playerXZ.distanceTo(zombie.position);
        
        // Comportamento AGGRO (Perseguição)
        if (distanceToPlayer < ZOMBIE_AGGRO_RANGE) {
            
            // ----------------------------------------------------------------------
            // NOVO: Lógica para parar de se mover quando estiver na distância de ataque/parada
            // ----------------------------------------------------------------------
            if (distanceToPlayer > ZOMBIE_ATTACK_RANGE) {
                // Calcular direção para o player (apenas no plano XZ)
                const targetPosition = player.position.clone();
                targetPosition.y = zombie.position.y; // Manter no mesmo plano
                
                const direction = targetPosition.sub(zombie.position).normalize();
                
                // Movimento
                zombie.position.x += direction.x * ZOMBIE_SPEED;
                zombie.position.z += direction.z * ZOMBIE_SPEED;
                
                // Rotação (virar para o player)
                const targetRotation = Math.atan2(direction.x, direction.z);
                zombie.rotation.y += (targetRotation - zombie.rotation.y) * 0.1;
            } else {
                // Comportamento ATTACK (Próximo o suficiente, mas PARADO)
                // O zumbi deve parar de se mover para não entrar no personagem
                // console.log("Zumbi atacando (parado)!");
                
                // Apenas gira para o player, mesmo parado
                const targetPosition = player.position.clone();
                targetPosition.y = zombie.position.y;
                const direction = targetPosition.sub(zombie.position).normalize();
                const targetRotation = Math.atan2(direction.x, direction.z);
                zombie.rotation.y += (targetRotation - zombie.rotation.y) * 0.1;
            }
            // ----------------------------------------------------------------------
            
            // Animação de braço (zumbi) - Continua mesmo parado
            zombie.userData.armTimer += 0.1;
            const swing = Math.sin(zombie.userData.armTimer) * 0.2;
            
            // Encontrar os braços
            const armMeshes = zombie.children.filter(c => c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);

            const leftArm = armMeshes.find(c => c.position.x < 0);
            const rightArm = armMeshes.find(c => c.position.x > 0);
            
            if (leftArm && rightArm) {
                leftArm.rotation.x = swing;
                rightArm.rotation.x = -swing;
            }

        } else {
            // Comportamento IDLE/Patrulha (fora do alcance AGGRO)
            // Animação de braço mais lenta ou parada (opcional)
        }
    });
}

// --- FIM DA LÓGICA DE ZUMBIS ---

// --- NOVO: LÓGICA DE GALINHAS (CHICKENS) ---

function createChicken() {
    const chickenGroup = new THREE.Group();
    
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF }); // Corpo branco
    const feetMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 }); // Pés laranja
    const headMaterial = bodyMaterial;
    
    // Corpo (ovoide)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 10, 10);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    chickenGroup.add(body);
    
    // Cabeça
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.85, 0.4);
    head.castShadow = true;
    chickenGroup.add(head);
    
    // Pés
    const footGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.3);
    const leftFoot = new THREE.Mesh(footGeometry, feetMaterial);
    leftFoot.position.set(-0.15, 0.1, 0);
    chickenGroup.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeometry, feetMaterial);
    rightFoot.position.set(0.15, 0.1, 0);
    chickenGroup.add(rightFoot);
    
    // Bico
    const beakGeometry = new THREE.ConeGeometry(0.05, 0.15, 4);
    const beak = new THREE.Mesh(beakGeometry, feetMaterial);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.85, 0.5);
    chickenGroup.add(beak);
    
    chickenGroup.userData.isChicken = true;
    chickenGroup.userData.moveTimer = 0;
    chickenGroup.userData.targetPosition = new THREE.Vector3();
    chickenGroup.userData.moveSpeed = 0.02 + Math.random() * 0.02;
    chickenGroup.userData.collisionRadius = 0.4; // NOVO: Raio de colisão da galinha
    
    // Define uma posição alvo inicial
    setNewChickenTarget(chickenGroup);
    
    return chickenGroup;
}

function setNewChickenTarget(chicken) {
    const worldRadius = worldSize * 0.8;
    chicken.userData.targetPosition.set(
        (Math.random() - 0.5) * worldRadius,
        chicken.position.y,
        (Math.random() - 0.5) * worldRadius
    );
    chicken.userData.moveTimer = Math.random() * 100 + 100; // Tempo até o próximo movimento
}

function spawnChickens() {
    const numChickens = 10;
    const worldRadius = worldSize * 0.8;

    for (let i = 0; i < numChickens; i++) {
        const chicken = createChicken();
        
        chicken.position.set(
            (Math.random() - 0.5) * worldRadius,
            0,
            (Math.random() - 0.5) * worldRadius
        );
        
        scene.add(chicken);
        chickens.push(chicken);
    }
}

function updateChickens() {
    chickens.forEach(chicken => {
        chicken.userData.moveTimer--;
        
        // Se alcançou o target ou o timer acabou, defina um novo target
        if (chicken.userData.moveTimer <= 0 || chicken.position.distanceTo(chicken.userData.targetPosition) < 0.2) {
            setNewChickenTarget(chicken);
        }
        
        // Movimento (apenas no plano XZ)
        const direction = chicken.userData.targetPosition.clone().sub(chicken.position).normalize();
        chicken.position.x += direction.x * chicken.userData.moveSpeed;
        chicken.position.z += direction.z * chicken.userData.moveSpeed;
        
        // Rotação para a direção
        const targetRotation = Math.atan2(direction.x, direction.z);
        chicken.rotation.y += (targetRotation - chicken.rotation.y) * 0.15;
        
        // Animação de "pulo" sutil
        chicken.position.y = 0.05 + Math.sin(Date.now() * 0.01 + chicken.userData.moveSpeed * 1000) * 0.05;
    });
}

// --- FIM DA LÓGICA DE GALINHAS ---

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Atualiza a posição da UI mobile
    updateUILayout();
}

function updateUI() {
    // Atualiza o display de moedas
    const coinsCarriedEl = document.getElementById('coinsCarried');
    const coinsStoredEl = document.getElementById('coinsStored');
    if (coinsCarriedEl) coinsCarriedEl.textContent = `Moedas: ${coinsCarried}/${maxCarryCapacity}`;
    if (coinsStoredEl) coinsStoredEl.textContent = `Guardadas: ${coinsStored}`;
    
    // Atualiza o nível
    const playerLevelEl = document.getElementById('level');
    if (playerLevelEl) playerLevelEl.textContent = `Nível ${playerLevel}`;
    
    // Atualiza a barra de experiência
    const expBar = document.getElementById('experienceFill'); // Corrigido de expBar para experienceFill (baseado no HTML)
    const nextLevelInfoEl = document.getElementById('nextLevelInfo');
    
    if (expBar && nextLevelInfoEl) {
        const currentLevelExp = levelRequirements[playerLevel - 1];
        const nextLevelExp = levelRequirements[playerLevel] || currentLevelExp + 100;
        const expNeeded = nextLevelExp - currentLevelExp;
        const expProgress = experience - currentLevelExp;
        const progressPercent = (expProgress / expNeeded) * 100;

        expBar.style.width = `${progressPercent}%`;
        nextLevelInfoEl.textContent = `Próximo nível: ${expNeeded - expProgress} moedas`;
    }

    // Atualiza a dica da máquina
    const machineDistance = machine.position.distanceTo(player.position);
    nearMachine = machineDistance < machine.userData.interactionRadius;
    const hint = document.getElementById('machinePrompt');
    
    if (hint) {
        if (nearMachine && coinsCarried > 0) {
            // MUDANÇA NA DICA AQUI: Agora usa a tecla 'E' para depositar.
            hint.textContent = 'Pressione [E] ou botão [guarde] para Depositar Moedas';
            hint.style.display = 'block';
        } else if (nearMachine && coinsCarried === 0) {
            hint.textContent = 'Deposite Moedas para Evoluir';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    }

    // Atualiza o cooldown do Dash
    const dashStatusEl = document.getElementById('dashStatus');
    const dashButton = document.getElementById('dashButton');
    
    if (dashStatusEl && dashButton) {
        if (dashCooldown > 0) {
            const remainingTime = Math.ceil(dashCooldown / 1000);
            dashStatusEl.textContent = `Dash: ${remainingTime}s`;
            dashButton.textContent = `${remainingTime}s`;
            dashButton.classList.add('cooldown');
        } else {
            dashStatusEl.textContent = 'Dash: Pronto';
            dashButton.textContent = 'Dash';
            dashButton.classList.remove('cooldown');
        }
    }
}

function updateUILayout() {
    // Lógica para posicionamento da UI mobile
    // Por exemplo, garante que o joystick está sempre no canto
}


function startDash() {
    if (isDashing || dashCooldown > 0) return;

    isDashing = true;
    
    // Aplica um impulso instantâneo no vetor de velocidade
    const dashMultiplier = 2; // Impulso inicial
    playerVelocity.x *= dashMultiplier;
    playerVelocity.z *= dashMultiplier;
    
    // Animação de dash visual (opcional)
    
    // Define o fim do dash
    setTimeout(() => {
        isDashing = false;
        dashCooldown = DASH_COOLDOWN_TIME;
    }, DASH_DURATION);
}


function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        // Lógica de atualização do jogo principal
        updatePlayer();
        updateCoins();
        updateZombies();
        updateLeaves();
        updateParticles(); // Adicionado para atualizar as partículas
        updateChickens(); // Adicionado para atualizar as galinhas

        // Câmera segue o jogador
        if (controls) { // Verifica se controls foi inicializado
            controls.target.copy(player.position);
            controls.update();
        }

        // Diminuir cooldown do dash
        if (dashCooldown > 0) {
            dashCooldown -= (1000 / 60); // Assumindo 60 FPS (16.66ms)
        }
    }

    if (renderer && scene && camera) { // Verificação de segurança
        renderer.render(scene, camera);
    }
    updateUI();
}

    // --- NOVO: LÓGICA DO MENU E MODAIS ---
    
    // Obter referências para todos os elementos do menu e modais
    const menuButton = document.getElementById('menuButton');
    const mainMenuModal = document.getElementById('mainMenuModal');
    const btnFecharMenu = document.getElementById('btnFecharMenu');

    const btnAbrirConfig = document.getElementById('btnAbrirConfig');
    const configuracoesModal = document.getElementById('configuracoesModal');
    const btnFecharConfig = document.getElementById('btnFecharConfig');

    const btnAbrirSair = document.getElementById('btnAbrirSair');
    const confirmarSaidaModal = document.getElementById('confirmarSaidaModal');
    const btnConfirmarSaida = document.getElementById('btnConfirmarSaida');
    const btnCancelarSaida = document.getElementById('btnCancelarSaida');
    
    // ----------------------------------------------------------------------
    // Função para Pausar/Despausar o Jogo
    // ----------------------------------------------------------------------
    // Assumindo que 'gameRunning' é uma variável global que controla o loop do jogo
    function toggleGamePause(isPaused) {
        // Se a variável 'gameRunning' existir, use-a para pausar/despausar
        if (typeof gameRunning !== 'undefined') {
            gameRunning = !isPaused;
            console.log(isPaused ? "Jogo Pausado." : "Jogo Despausado.");
        }
        // Se você usa o requestAnimationFrame, o próprio motor do jogo deve checar 'gameRunning'
    }

    // ----------------------------------------------------------------------
    // 1. Abrir/Fechar o Menu Principal
    // ----------------------------------------------------------------------
    // É necessário verificar se os elementos foram encontrados antes de adicionar o listener
    if (menuButton && mainMenuModal) {
        menuButton.addEventListener('click', () => {
            mainMenuModal.style.display = 'block';
            toggleGamePause(true); // Pausa o jogo
        });
    }

    if (btnFecharMenu && mainMenuModal) {
        btnFecharMenu.addEventListener('click', () => {
            mainMenuModal.style.display = 'none';
            toggleGamePause(false); // Despausa o jogo
        });
    }

    // ----------------------------------------------------------------------
    // 2. Abrir/Fechar Configurações
    // ----------------------------------------------------------------------
    if (btnAbrirConfig && mainMenuModal && configuracoesModal) {
        btnAbrirConfig.addEventListener('click', () => {
            mainMenuModal.style.display = 'none'; // Esconde o menu principal
            configuracoesModal.style.display = 'block';
        });
    }

    if (btnFecharConfig && configuracoesModal && mainMenuModal) {
        btnFecharConfig.addEventListener('click', () => {
            configuracoesModal.style.display = 'none';
            mainMenuModal.style.display = 'block'; // Volta para o menu principal
        });
    }

    // ----------------------------------------------------------------------
    // 3. Lógica de Sair
    // ----------------------------------------------------------------------
    if (btnAbrirSair && mainMenuModal && confirmarSaidaModal) {
        btnAbrirSair.addEventListener('click', () => {
            mainMenuModal.style.display = 'none'; // Esconde o menu principal
            confirmarSaidaModal.style.display = 'block';
        });
    }
    
    if (btnCancelarSaida && confirmarSaidaModal && mainMenuModal) {
        btnCancelarSaida.addEventListener('click', () => {
            confirmarSaidaModal.style.display = 'none';
            mainMenuModal.style.display = 'block'; // Volta para o menu principal
        });
    }
    
    if (btnConfirmarSaida) {
        btnConfirmarSaida.addEventListener('click', () => {
            // AÇÃO REAL DE SAÍDA:
            console.log("Saindo do jogo! Redirecionando...");
            // Implemente sua lógica final (salvar, fechar recursos, etc.)
            
            // Exemplo: Redirecionar para a tela inicial
            // window.location.href = 'index.html'; 
        });
    }
    
    // ----------------------------------------------------------------------
    // 4. Fechar Modais com a tecla ESC
    // ----------------------------------------------------------------------
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (confirmarSaidaModal && confirmarSaidaModal.style.display === 'block') {
                btnCancelarSaida.click(); // Cancela a saída
            } else if (configuracoesModal && configuracoesModal.style.display === 'block') {
                btnFecharConfig.click(); // Fecha configurações
            } else if (mainMenuModal && mainMenuModal.style.display === 'block') {
                btnFecharMenu.click(); // Fech
            }
        }
    });

// Inicialize o jogo
init();

