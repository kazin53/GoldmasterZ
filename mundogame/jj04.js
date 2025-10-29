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

// Configurações de nível
const levelRequirements = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// Aumentando o tamanho do mundo em 4x (dobrando a largura e o comprimento)
const worldSize = 200;

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
const DASH_SPEED_MULTIPLIER = 4; // 4x a velocidade normal

// Adicionando controles de órbita
let controls;

// Variáveis para a animação do personagem Roblox
let leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup;

// NOVO: Array para guardar os zumbis
let zombies = []; 

// NOVO: Posições pré-definidas para os zumbis
const ZOMBIE_SPAWN_POSITIONS = [ 
    { x: -70, y: 0, z: 70 },
    { x: 70, y: 0, z: 70 },
    { x: -70, y: 0, z: -70 },
    { x: 70, y: 0, z: -70 }
];

// NOVO: Constantes para o comportamento dos zumbis
const ZOMBIE_AGGRO_RANGE = 25; // Distância para começar a perseguir
const ZOMBIE_ATTACK_RANGE = 2.5; // Distância para atacar
const ZOMBIE_SPEED = 0.08; // Velocidade de perseguição (ajustada para ser mais lenta)

// --- NOVO: Variáveis e Estruturas de Dados para Colisões ---
let chickens = [];
// NOVO: Array para guardar os cactos
let cacti = []; 

// NOVO: Constantes de cor para o deserto
const DESERT_SAND = 0xD2B48C; // Bege/Areia
const DESERT_SKY = 0xADD8E6; // Azul claro (céu)
const DESERT_FOG = 0xC19A6B; // Cor de poeira/névoa
const CACTUS_GREEN = 0x556B2F; // Verde escuro para o cacto
const WOOD_BROWN = 0x8B4513; // Marrom para madeira velha


// ****************** CORREÇÃO AQUI ******************
// Ativar fullscreen no primeiro toque em qualquer lugar da tela
function requestFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { /* Firefox */
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { /* IE/Edge */
        element.msRequestFullscreen();
    }
}

function enableFullscreenOnFirstTap() {
    const tapPrompt = document.getElementById("tapPrompt");
    if (!tapPrompt) {
        console.error("Elemento #tapPrompt não encontrado!");
        
        // CORREÇÃO: Se não encontrar o tapPrompt, inicia o jogo diretamente
        init();
        return; 
    }

    function activateFullscreen() {
        requestFullscreen(document.documentElement);

        // Esconde o overlay de instrução
        if (tapPrompt) {
            tapPrompt.style.display = "none";
        }

        // Remove os listeners (só precisa 1 toque)
        document.removeEventListener("click", activateFullscreen);
        document.removeEventListener("touchstart", activateFullscreen);
        
        // O jogo pode começar agora
        init();
    }

    // Adiciona os event listeners para iniciar o jogo e o fullscreen
    document.addEventListener("click", activateFullscreen);
    document.addEventListener("touchstart", activateFullscreen);
}
// Chame a função de tela cheia logo no início.
enableFullscreenOnFirstTap();


// Configuração inicial
function init() {
    // Cena - Trocado a cor da névoa para deserto
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(DESERT_FOG, worldSize * 0.4, worldSize * 1.5);

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20); // Posição inicial da câmera ajustada para uma boa visualização

    // Renderer - Trocado a cor de fundo para o céu do deserto
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(DESERT_SKY, 1);
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

    // Criar mundo
    createGround();
    createRobloxCharacter(); // CHAMA A NOVA FUNÇÃO AQUI
    createMachine();
    spawnCoins();
    
    // NOVO: Chama a função para criar os cactos
    spawnCacti(); 

    // NOVO: Criar zumbis
    spawnZombies(); 
    
    // NOVO: Adicione as galinhas ao mundo
    spawnChickens();

    // Controles de órbita para a câmera
    // Verifica se OrbitControls está carregado globalmente
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.5, 0); // Foca a câmera no novo personagem
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

    // Event listeners
    setupControls();

    // Inicializar UI
    updateUI();

    // Iniciar loop do jogo
    animate();
}

function createGround() {
    // Chão principal - Trocado para cor de areia
    const groundGeometry = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: DESERT_SAND, // Cor de areia/bege
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
    // OTIMIZAÇÃO: Usando InstancedMesh para detalhes do deserto
    const dryBushCount = 1800; // Arbustos secos (menos densidade que a grama)
    const smallRockCount = 1000;
    const largeRockCount = 600;
    const groundArea = worldSize * 1.8;
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969, flatShading: true });


    // Arbustos Secos/Tumbleweeds
    // Usando uma forma de Cone para simular um arbusto seco/bola de feno.
    const bushGeometry = new THREE.ConeGeometry(0.3, 0.3, 4); // Pequeno e baixo
    const bushMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const bushInstancedMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, dryBushCount);
    const bushMatrix = new THREE.Matrix4();
    const bushColor = new THREE.Color();
    for (let i = 0; i < dryBushCount; i++) {
        bushMatrix.makeRotationY(Math.random() * Math.PI * 2);
        bushMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.15,
            (Math.random() - 0.5) * groundArea
        );
        bushInstancedMesh.setMatrixAt(i, bushMatrix);
        // Cor marrom/seca
        bushInstancedMesh.setColorAt(i, bushColor.setHSL(0.1, 0.5 + Math.random() * 0.3, 0.2 + Math.random() * 0.15));
    }
    bushInstancedMesh.castShadow = true;
    scene.add(bushInstancedMesh);

    // Pedras Pequenas (mais numerosas)
    const smallRockGeometry = new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15);
    const smallRockInstancedMesh = new THREE.InstancedMesh(smallRockGeometry, rockMaterial, smallRockCount);
    const smallRockMatrix = new THREE.Matrix4();
    for (let i = 0; i < smallRockCount; i++) {
        smallRockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        smallRockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.1,
            (Math.random() - 0.5) * groundArea
        );
        smallRockInstancedMesh.setMatrixAt(i, smallRockMatrix);
    }
    scene.add(smallRockInstancedMesh);

    // Pedras Grandes (menos numerosas e mais visíveis)
    const largeRockGeometry = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.5);
    const largeRockInstancedMesh = new THREE.InstancedMesh(largeRockGeometry, rockMaterial, largeRockCount);
    const largeRockMatrix = new THREE.Matrix4();
    for (let i = 0; i < largeRockCount; i++) {
        largeRockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        largeRockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.3,
            (Math.random() - 0.5) * groundArea
        );
        largeRockInstancedMesh.setMatrixAt(i, largeRockMatrix);
    }
    largeRockInstancedMesh.castShadow = true;
    scene.add(largeRockInstancedMesh);
}

function createWorldBorders() {
    const borderHeight = 3;
    const borderWidth = 0.5;
    // Borda de madeira velha/pedra no deserto
    const borderMaterial = new THREE.MeshLambertMaterial({ color: WOOD_BROWN });

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

// NOVO PERSONAGEM
function createRobloxCharacter() {
    player = new THREE.Group();
    player.position.set(0, 1.5, 0);
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

function createMachine() {
    machine = new THREE.Group();
    machine.position.set(0, 0, 0);
    scene.add(machine);

    // Base da máquina - Trocado para cor de madeira velha
    const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: WOOD_BROWN }); // Marrom Madeira
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    machine.add(base);

    // Corpo principal - Trocado para cor de ferro enferrujado
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 }); // Cinza Metal
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    machine.add(body);

    // Topo da máquina - Cobre/Bronze
    const topGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0xB87333 }); // Cobre
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

    // Tela da máquina - Display antigo/digital
    const screenGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMaterial = new THREE.MeshLambertMaterial({
        color: 0xFF0000, // Display vermelho/laranja
        emissive: 0x330000
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
    machine.userData = { interactionRadius: 3 };
}

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

// --- NOVO: LÓGICA DO CACTO SAGUARO ---

function createCactus() {
    const cactusGroup = new THREE.Group();
    const cactusMaterial = new THREE.MeshLambertMaterial({ color: CACTUS_GREEN }); 
    const baseRadius = 0.5;
    const baseHeight = 5 + Math.random() * 3; // Altura base variada

    // Tronco principal
    const mainTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(baseRadius, baseRadius * 0.8, baseHeight, 6),
        cactusMaterial
    );
    mainTrunk.position.y = baseHeight / 2;
    mainTrunk.castShadow = true;
    cactusGroup.add(mainTrunk);

    // Adicionar braços (aleatórios, máximo 2)
    const numArms = Math.floor(Math.random() * 3); 
    const armScale = 0.4;
    
    for (let i = 0; i < numArms; i++) {
        const armLength = 2 + Math.random() * 1.5;
        const armBaseY = baseHeight * (0.35 + Math.random() * 0.4); // Ponto de conexão no tronco
        const direction = i % 2 === 0 ? 1 : -1;

        // Crio um grupo para o braço inteiro (horizontal + vertical)
        const fullArmGroup = new THREE.Group();
        fullArmGroup.position.set(0, armBaseY, 0); // Onde o braço se conecta ao tronco

        // Braço horizontal
        const horizArm = new THREE.Mesh(
            new THREE.CylinderGeometry(baseRadius * armScale, baseRadius * armScale, armLength, 6),
            cactusMaterial
        );
        horizArm.rotation.z = Math.PI / 2 * direction;
        horizArm.position.set(armLength / 2 * direction, 0, 0);
        
        // Braço vertical (que aponta para cima)
        const finalArmHeight = 1.5 + Math.random() * 1;
        const vertArm = new THREE.Mesh(
            new THREE.CylinderGeometry(baseRadius * armScale, baseRadius * armScale, finalArmHeight, 6),
            cactusMaterial
        );
        vertArm.position.set(armLength * direction, finalArmHeight / 2, 0);
        
        fullArmGroup.add(horizArm);
        fullArmGroup.add(vertArm);

        // Rotaciona o braço para variar a posição no plano XZ
        fullArmGroup.rotation.y = Math.random() * Math.PI * 2; 

        cactusGroup.add(fullArmGroup);
    }
    
    cactusGroup.userData.isCactus = true;
    
    return cactusGroup;
}


// Função para espalhar os cactos no mapa
function spawnCacti() {
    const numCacti = 30; 
    const worldRadius = worldSize * 0.85;

    // Remove os cactos existentes antes de popular novamente
    cacti.forEach(cactus => scene.remove(cactus));
    cacti = [];

    for (let i = 0; i < numCacti; i++) {
        const cactus = createCactus();

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * worldRadius;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        cactus.position.set(x, 0, z);

        // Variação de escala e rotação
        const scale = 0.8 + Math.random() * 0.4;
        cactus.scale.set(scale, scale, scale);
        cactus.rotation.y = Math.random() * Math.PI * 2;

        scene.add(cactus);
        cacti.push(cactus); 
    }
}

// --- FIM DA LÓGICA DO CACTO ---

function setupControls() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;

        // Interação com a máquina
        if (event.code === 'Space' && nearMachine && coinsCarried > 0) {
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
        joystickActive = true;
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

    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true;
        if (nearMachine && coinsCarried > 0) {
            depositCoins();
        }
    });

    jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });

    dashButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!isDashing && dashCooldown <= 0) {
            startDash();
        }
    });
}

function updatePlayer() {
    if (!gameRunning) return;

    const jumpPower = 0.35;
    const gravity = -0.025; 
    let friction = isDashing ? 0.92 : 0.85; 

    // CORREÇÃO APLICADA AQUI: Altura de repouso do personagem
    const RESTING_HEIGHT = 1.5; 
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
    }

    // Aplicar gravidade
    if (!onGround) {
        playerVelocity.y += gravity;
    } else {
        playerVelocity.y = 0;
        player.position.y = RESTING_HEIGHT; // Usa a nova altura de repouso
    }

    // Aplicar fricção
    playerVelocity.x *= friction;
    playerVelocity.z *= friction;

    // Atualizar posição
    player.position.x += playerVelocity.x;
    player.position.y += playerVelocity.y;
    player.position.z += playerVelocity.z;

    // Garantir que o player não saia do mapa
    const halfSize = worldSize - 1.5;
    player.position.x = Math.max(-halfSize, Math.min(halfSize, player.position.x));
    player.position.z = Math.max(-halfSize, Math.min(halfSize, player.position.z));
    
    // Rotação dos braços e pernas (Animação de corrida simples)
    if (moveDirection.length() > 0 && onGround) {
        const swing = Math.sin(Date.now() * 0.015) * 0.6;
        leftArmGroup.rotation.x = swing;
        rightArmGroup.rotation.x = -swing;
        leftLegGroup.rotation.x = -swing;
        rightLegGroup.rotation.x = swing;
    } else {
        // Posição de descanso
        leftArmGroup.rotation.x = 0;
        rightArmGroup.rotation.x = 0;
        leftLegGroup.rotation.x = 0;
        rightLegGroup.rotation.x = 0;
    }

    // Animação sutil de respiração (NOVO)
    if (player) {
        player.scale.y = 1 + Math.sin(Date.now() * 0.001) * 0.02;
    }
}

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
        
        // Distância do player
        const distanceToPlayer = player.position.distanceTo(zombie.position);
        
        // Comportamento AGGRO (Perseguição)
        if (distanceToPlayer < ZOMBIE_AGGRO_RANGE) {
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
            
            // Animação de braço (zumbi)
            zombie.userData.armTimer += 0.1;
            const swing = Math.sin(zombie.userData.armTimer) * 0.2;
            
            const leftArm = zombie.children.find(c => c.position.x < 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            const rightArm = zombie.children.find(c => c.position.x > 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            
            if (leftArm && rightArm) {
                leftArm.rotation.x = swing;
                rightArm.rotation.x = -swing;
            }
            
            // Comportamento ATTACK (Próximo o suficiente)
            if (distanceToPlayer < ZOMBIE_ATTACK_RANGE) {
                // Lógica de ataque: causar dano, etc. (Apenas placeholder)
                // console.log("Zumbi atacando!");
            }
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
    if (coinsCarriedEl) coinsCarriedEl.textContent = coinsCarried;
    if (coinsStoredEl) coinsStoredEl.textContent = coinsStored;
    
    // Atualiza o nível
    const playerLevelEl = document.getElementById('playerLevel');
    if (playerLevelEl) playerLevelEl.textContent = playerLevel;
    
    // Atualiza a barra de experiência
    const expBar = document.getElementById('expBar');
    const expProgressEl = document.getElementById('expProgress');
    if (expBar && expProgressEl) {
        const currentLevelExp = levelRequirements[playerLevel - 1];
        const nextLevelExp = levelRequirements[playerLevel] || currentLevelExp + 100;
        const expNeeded = nextLevelExp - currentLevelExp;
        const expProgress = experience - currentLevelExp;
        const progressPercent = (expProgress / expNeeded) * 100;

        expBar.style.width = `${progressPercent}%`;
        expProgressEl.textContent = `${expProgress}/${expNeeded} XP`;
    }

    // Atualiza a dica da máquina
    const machineDistance = machine.position.distanceTo(player.position);
    nearMachine = machineDistance < machine.userData.interactionRadius;
    const hint = document.getElementById('machineHint');
    
    if (hint) {
        if (nearMachine && coinsCarried > 0) {
            hint.textContent = 'Aperte [ESPAÇO] ou [PULAR] para Depositar Moedas';
            hint.style.display = 'block';
        } else if (nearMachine && coinsCarried === 0) {
            hint.textContent = 'Deposite Moedas para Evoluir';
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    }

    // Atualiza o cooldown do Dash
    const dashButton = document.getElementById('dashButton');
    if (dashButton) {
        if (dashCooldown > 0) {
            const remainingTime = Math.ceil(dashCooldown / 1000);
            dashButton.textContent = `${remainingTime}s`;
            dashButton.classList.add('cooldown');
        } else {
            dashButton.textContent = 'DASH';
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
        // REMOVIDO: updateLeaves();
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

// Sistema de confirmação ao sair da página
function setupBackButtonConfirmation() {
    // Variável para controlar se a saída foi confirmada
    let exitConfirmed = false;
    
    // Verifica se o navegador suporta a API History
    if (window.history && window.history.pushState) {
        // Adiciona um estado ao histórico para poder detectar o back button
        window.history.pushState('game-page', null, window.location.href);
        
        // Event listener para quando o usuário tenta voltar
        window.addEventListener('popstate', function(event) {
            // Se já confirmou a saída, permite a navegação
            if (exitConfirmed) {
                return;
            }
            
            // Mostra o modal de confirmação
            showExitConfirmation();
            
            // Adiciona novamente o estado para continuar detectando back button
            window.history.pushState('game-page', null, window.location.href);
        });
    }

    // Função para confirmar saída - AGORA VOLTA PARA INDEX.HTML
    window.confirmExit = function() {
        exitConfirmed = true;
        const modal = document.getElementById('exitConfirmationModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Redireciona para index.html
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    }

    // Função para cancelar saída
    window.stayOnPage = function() {
        const modal = document.getElementById('exitConfirmationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Função para mostrar o modal de confirmação
function showExitConfirmation() {
    const modal = document.getElementById('exitConfirmationModal');
    if (modal) {
        modal.style.display = 'flex';
        // Adiciona efeito de shake para chamar atenção
        const content = modal.querySelector('.exit-modal-content');
        content.classList.add('shake');
        setTimeout(() => {
            content.classList.remove('shake');
        }, 500);
    }
}

// Função para criar o modal dinamicamente
function createExitConfirmationModal() {
    // Verifica se o modal já existe
    if (document.getElementById('exitConfirmationModal')) {
        return;
    }
    
    const modalHTML = `
        <div id="exitConfirmationModal" class="exit-modal">
            <div class="exit-modal-content">
                <div class="exit-modal-header">
                    <h3>🏃‍♂️ Voltar ao Menu?</h3>
                </div>
                <div class="exit-modal-body">
                    <p>Tem certeza que deseja voltar ao menu principal?</p>
                </div>
                <div class="exit-modal-footer">
                    <button onclick="stayOnPage()" class="exit-btn exit-btn-cancel">🎮 Continuar Jogando</button>
                    <button onclick="confirmExit()" class="exit-btn exit-btn-confirm">🏠 Voltar ao Menu</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Fecha o modal ao clicar fora dele
    document.getElementById('exitConfirmationModal').addEventListener('click', function(e) {
        if (e.target === this) {
            stayOnPage();
        }
    });
}

// Também detecta tentativas de fechar a aba/janela
function setupBeforeUnload() {
    let shouldConfirmExit = true;
    
    window.addEventListener('beforeunload', function(e) {
        if (shouldConfirmExit) {
            const message = 'Tem certeza que deseja sair? Seu progresso pode ser perdido.';
            e.returnValue = message;
            return message;
        }
    });
    
    // Quando confirmar saída pelo modal, não mostra mais o alerta do beforeunload
    window.confirmExit = function() {
        shouldConfirmExit = false;
        const modal = document.getElementById('exitConfirmationModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Redireciona para index.html
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    }
}

// Inicializa o sistema quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    createExitConfirmationModal();
    setupBackButtonConfirmation();
    setupBeforeUnload();
});

// Versão alternativa que também funciona
function createSimpleExitHandler() {
    let canExit = false;
    
    window.history.pushState(null, null, window.location.href);
    
    window.addEventListener('popstate', function(event) {
        if (!canExit) {
            showExitConfirmation();
            window.history.pushState(null, null, window.location.href);
        }
    });
    
    window.simpleConfirmExit = function() {
        canExit = true;
        const modal = document.getElementById('exitConfirmationModal');
        if (modal) modal.style.display = 'none';
        
        // Redireciona para index.html
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    }
}

// Use esta versão se a anterior não funcionar
createSimpleExitHandler();