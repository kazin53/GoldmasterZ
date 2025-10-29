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

// Array para guardar os zumbis (agora zumbis congelados)
let zombies = []; 

// Array para os flocos de neve caindo (substituindo 'leaves')
let snowflakes = []; 

// Posições pré-definidas para os zumbis
const ZOMBIE_SPAWN_POSITIONS = [ 
    { x: -70, y: 0, z: 70 },
    { x: 70, y: 0, z: 70 },
    { x: -70, y: 0, z: -70 },
    { x: 70, y: 0, z: -70 }
];

// Constantes para o comportamento dos zumbis
const ZOMBIE_AGGRO_RANGE = 25; 
const ZOMBIE_ATTACK_RANGE = 2.5; 
const ZOMBIE_SPEED = 0.05; 

// --- Variáveis e Estruturas de Dados para Colisões ---
let chickens = [];
let trees = []; // Árvores secas
let iceMountains = []; // <-- NOVO: Múltiplas montanhas de gelo distantes

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
    // Cena (Céu de Inverno)
    scene = new THREE.Scene();
    // A névoa (Fog) vai esconder as bordas do mundo e ajudar a integrar as montanhas distantes
    scene.fog = new THREE.Fog(0xADD8E6, worldSize * 0.4, worldSize * 1.5); // Névoa Azul Claro

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20); 

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xADD8E6, 1); // Fundo Azul Claro
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Luz mais brilhante, simula o reflexo da neve
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048; 
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);

    // Criar mundo
    createGround();
    createRobloxCharacter(); 
    createMachine();
    spawnCoins();
    
    // CHAMA A NOVA FUNÇÃO PARA CRIAR AS MONTANHAS DE GELO DISTANTES
    createDistantIceMountains(); // <-- NOVO

    // CHAMA A NOVA FUNÇÃO PARA CRIAR AS ÁRVORES SECAS
    spawnGameTrees(); 

    // Criar zumbis congelados
    spawnZombies(); 
    
    // Adicione as galinhas (agora Galinhas Congeladas) ao mundo
    spawnChickens();

    // Controles de órbita para a câmera
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.5, 0); 
        controls.enableDamping = false; 
        controls.dampingFactor = 0; 
        controls.enablePan = true;
        controls.minDistance = 9;
        controls.maxDistance = 9;
        controls.maxPolarAngle = Math.PI / 2.2; 
        controls.update();
    } else {
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
    // Chão principal (Neve)
    const groundGeometry = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0xF0F8FF, // Branco Neve
        transparent: true,
        opacity: 0.9
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar detalhes de Neve e Gelo
    createGroundDetails();

    // Bordas do mundo (Gelo) - Mantido para colisão, mas a montanha distrai o olhar
    createWorldBorders();
}

function createGroundDetails() {
    // OTIMIZAÇÃO: Usando InstancedMesh para detalhes de gelo, pedras e neve
    const iceShardCount = 3200; // Fagulhas de gelo (substituindo grama)
    const rockCount = 800; // Pedras cobertas de neve
    const snowPatchCount = 480; // Manchas de neve mais densas
    const groundArea = worldSize * 1.8;

    // Fagulhas de Gelo (Ice Shards)
    const iceGeometry = new THREE.ConeGeometry(0.1, 0.4, 3); // Formato triangular
    const iceMaterial = new THREE.MeshLambertMaterial({ flatShading: true, color: 0xADD8E6, transparent: true, opacity: 0.8 });
    const iceInstancedMesh = new THREE.InstancedMesh(iceGeometry, iceMaterial, iceShardCount);
    const iceMatrix = new THREE.Matrix4();
    const iceColor = new THREE.Color();
    for (let i = 0; i < iceShardCount; i++) {
        iceMatrix.makeRotationY(Math.random() * Math.PI * 2);
        iceMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.2,
            (Math.random() - 0.5) * groundArea
        );
        iceInstancedMesh.setMatrixAt(i, iceMatrix);
        iceInstancedMesh.setColorAt(i, iceColor.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.7 + Math.random() * 0.2));
    }
    iceInstancedMesh.castShadow = true;
    scene.add(iceInstancedMesh);

    // Pedras Nevadas
    const rockGeometry = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0xA9A9A9, flatShading: true }); // Cinza Escuro
    const rockInstancedMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
    const rockMatrix = new THREE.Matrix4();
    for (let i = 0; i < rockCount; i++) {
        rockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        rockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.3,
            (Math.random() - 0.5) * groundArea
        );
        rockInstancedMesh.setMatrixAt(i, rockMatrix);
    }
    rockInstancedMesh.castShadow = true;
    scene.add(rockInstancedMesh);
    
    // Manchas de Neve
    const snowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });
    const snowInstancedMesh = new THREE.InstancedMesh(snowGeometry, snowMaterial, snowPatchCount);
    const snowMatrix = new THREE.Matrix4();
    for (let i = 0; i < snowPatchCount; i++) {
        snowMatrix.makeScale(1, 0.3, 1); // achatado
        snowMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        snowMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.05,
            (Math.random() - 0.5) * groundArea
        );
        snowInstancedMesh.setMatrixAt(i, snowMatrix);
    }
    scene.add(snowInstancedMesh);
}

function createWorldBorders() {
    const borderHeight = 3;
    const borderWidth = 0.5;
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEFA }); // Gelo Azul

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

// NOVO PERSONAGEM (Pequena adaptação de cor para casar com o tema)
function createRobloxCharacter() {
    player = new THREE.Group();
    player.position.set(0, 1.5, 0);
    scene.add(player);

    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xF1C27D });
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0x3498DB }); // Azul Frio
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x7F8C8D }); // Cinza Frio
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
    const chestDetail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.52), new THREE.MeshLambertMaterial({ color: 0x2980B9 })); // Azul mais escuro
    chestDetail.position.set(0, 1.1, 0);
    player.add(chestDetail);

    player.add(body);

    // Braços mais musculosos e detalhados
    const armGeometry = new THREE.BoxGeometry(0.35, 1.1, 0.35);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xBDC3C7 }); // Cinza/Metal
    // ... (restante do código do braço e perna mantido com materiais ajustados)
    
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
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x2C3E50 }));
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

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshLambertMaterial({ color: 0x2C3E50 }));
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

    // Base da máquina (Azul Gelo)
    const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEFA });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    machine.add(base);

    // Corpo principal (Ciano Gelo)
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x40E0D0 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    machine.add(body);

    // Topo da máquina (Azul Metálico)
    const topGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
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

    // Tela da máquina (Branco/Gelo)
    const screenGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMaterial = new THREE.MeshLambertMaterial({
        color: 0x00FFFF, // Ciano Elétrico
        emissive: 0x002222
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 2.5, 1.85);
    machine.add(screen);

    // Luzes da máquina (Azul e Branco)
    for (let i = 0; i < 4; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({
            color: i % 2 === 0 ? 0x00BFFF : 0xFFFFFF,
            emissive: i % 2 === 0 ? 0x000033 : 0x222222
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
        color: 0xD3D3D3, // Prata Frio
        emissive: 0x111111 // Brilho de metal
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

    // Efeito de brilho (Ciano Gelo)
    const glowGeometry = new THREE.RingGeometry(0.5, 0.7, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x40E0D0,
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

// --- INÍCIO DO CÓDIGO DA ÁRVORE SECA E NEVADA ---

// Função para criar cilindro (tronco)
function createSimpleBranch(radius, height, color = 0x695F57, segments = 6) { // Cor marrom seco
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        flatShading: true
    });
    const branch = new THREE.Mesh(geometry, material);
    branch.castShadow = true;
    return branch;
}

// Função para criar uma camada de neve
function createSnowCap(radius, positionY) {
    const geometry = new THREE.SphereGeometry(radius * 1.1, 10, 10, 0, Math.PI * 2, 0, Math.PI / 3); // Semiesfera achatada
    const material = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const snow = new THREE.Mesh(geometry, material);
    snow.position.y = positionY;
    snow.rotation.x = -Math.PI / 2;
    snow.castShadow = true;
    return snow;
}

// Função para criar uma única árvore seca com neve
function createGameTree() {
    const treeGroup = new THREE.Group();

    // Tronco principal: um cilindro simples
    const trunkHeight = 12;
    const trunkRadius = 1.0;
    const trunk = createSimpleBranch(trunkRadius, trunkHeight);
    trunk.position.y = trunkHeight / 2;
    treeGroup.add(trunk);

    // Galhos Principais (Mais escuros e nus)
    const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x493B33, flatShading: true });
    
    for (let i = 0; i < 4; i++) {
        const branchGeometry = new THREE.BoxGeometry(1, 1, 6);
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        
        branch.rotation.y = (i / 4) * Math.PI * 2;
        branch.rotation.z = Math.PI / 4 + Math.random() * 0.2;
        
        branch.position.set(
            Math.cos(branch.rotation.y) * 2,
            trunkHeight * 0.8,
            Math.sin(branch.rotation.y) * 2
        );
        branch.castShadow = true;
        treeGroup.add(branch);

        // Neve na ponta do galho
        const snowCap = createSnowCap(1, trunkHeight * 0.8 + 0.5);
        snowCap.position.copy(branch.position);
        snowCap.position.y += Math.sin(branch.rotation.z) * 3 + 0.1;
        treeGroup.add(snowCap);
    }
    
    // Neve no topo do tronco
    const topSnow = createSnowCap(trunkRadius * 1.5, trunkHeight);
    treeGroup.add(topSnow);

    // Salva a posição e o raio para spawn de flocos de neve
    treeGroup.userData.foliageBaseY = trunkHeight; 
    treeGroup.userData.foliageMaxRadius = 4; // A área ao redor
    
    return treeGroup;
}

// Função para espalhar as árvores no mapa
function spawnGameTrees() {
    const numTrees = 30; // Menos árvores para um visual mais desolado
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
        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);
        tree.rotation.y = Math.random() * Math.PI * 2;

        scene.add(tree);
        trees.push(tree); // Adiciona a árvore à lista para verificação de colisão
    }
}
// --- FIM DO CÓDIGO DA ÁRVORE SECA E NEVADA ---


// --- NOVO: FUNÇÕES MONTANHA DE GELO DISTANTE (GLACIAR) ---

// Função para criar uma única montanha de gelo (Glaciar)
function createDistantIceMountain(x, z) {
    const mountainGroup = new THREE.Group();
    mountainGroup.position.set(x, 0, z);

    // Geometria inicial (Icosaedro para forma orgânica)
    const geometry = new THREE.IcosahedronGeometry(25, 4); 

    // Material de Gelo
    const material = new THREE.MeshLambertMaterial({
        color: 0xADD8E6, // Azul Claro Gelo
        flatShading: true,
        transparent: true,
        opacity: 0.9,
        wireframe: false
    });

    // Deslocamento de vértices para torná-la rugosa (Glaciar)
    const positionAttribute = geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
        const vector = new THREE.Vector3();
        vector.fromBufferAttribute(positionAttribute, i);
        
        // Adicionar ruído
        const noise = Math.random() * 5; 
        
        // Deslocar na direção da normal
        vector.normalize().multiplyScalar(25 + noise * 5); 
        
        // Aplicar ruído à altura (eixo Y)
        if (vector.y > 0) {
             vector.y += Math.random() * 10;
        }

        positionAttribute.setXYZ(i, vector.x, vector.y, vector.z);
    }
    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;


    const iceMountain = new THREE.Mesh(geometry, material);
    iceMountain.position.y = 10; 
    
    // Aumentar a escala para parecer gigantesca ao longe
    const scaleFactor = 3 + Math.random() * 1.5; 
    iceMountain.scale.set(scaleFactor, scaleFactor * 1.5, scaleFactor);
    iceMountain.rotation.y = Math.random() * Math.PI * 2;
    iceMountain.castShadow = true;
    iceMountain.receiveShadow = true;
    
    // Adicionar neve no topo (para melhor visual)
    const snowCapRadius = 15 * scaleFactor;
    const snowCapGeometry = new THREE.SphereGeometry(snowCapRadius, 10, 10, 0, Math.PI * 2, 0, Math.PI / 3);
    const snowCapMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });
    const snowCap = new THREE.Mesh(snowCapGeometry, snowCapMaterial);
    snowCap.position.y = 35 * scaleFactor * 1.5; // Ajuste baseado na nova altura
    snowCap.rotation.x = -Math.PI / 2; 
    snowCap.castShadow = true;

    mountainGroup.add(iceMountain);
    mountainGroup.add(snowCap);

    scene.add(mountainGroup);
    iceMountains.push(mountainGroup);
}

// Função para espalhar as montanhas distantes
function createDistantIceMountains() {
    const numMountains = 10; // 10 montanhas circulando o mapa
    const distance = worldSize * 3; // 600 unidades de distância (bem longe)

    for (let i = 0; i < numMountains; i++) {
        const angle = (i / numMountains) * Math.PI * 2;
        
        // Adiciona um pouco de aleatoriedade no ângulo e na distância para não ser um círculo perfeito
        const randomAngleOffset = (Math.random() - 0.5) * 0.5;
        const randomDistOffset = (Math.random() - 0.5) * worldSize;

        const x = Math.cos(angle + randomAngleOffset) * (distance + randomDistOffset);
        const z = Math.sin(angle + randomAngleOffset) * (distance + randomDistOffset);
        
        createDistantIceMountain(x, z); 
    }
}
// --- FIM DAS FUNÇÕES MONTANHA DE GELO DISTANTE (GLACIAR) ---

// --- NOVO: LÓGICA DE FLOCOS DE NEVE CAINDO ---

// Função para criar uma partícula de floco de neve
function createSnowflakeParticle() {
    const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6); // Pequena esfera branca
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
    });
    const snowflake = new THREE.Mesh(particleGeometry, particleMaterial);

    // Posição inicial no topo da cena
    const worldRadius = worldSize * 0.9;
    snowflake.position.set(
        (Math.random() - 0.5) * worldRadius * 2,
        worldSize * 0.8, // Começa bem no alto
        (Math.random() - 0.5) * worldRadius * 2
    );
    
    // Configuração de animação
    snowflake.userData = {
        speedY: (Math.random() * 0.005) + 0.01, // Velocidade de queda MUITO lenta
        windX: (Math.random() - 0.5) * 0.001, // Vento horizontal leve
        windZ: (Math.random() - 0.5) * 0.001,
        waveOffset: Math.random() * Math.PI * 2 // Para movimento de onda
    };

    scene.add(snowflake);
    snowflakes.push(snowflake);
}

// Função para atualizar os flocos de neve caindo
function updateSnowflakes() {
    // Manter um número constante de flocos ativos para um fluxo contínuo
    const MAX_SNOWFLAKES = 400; // Mais flocos para um bom efeito
    if (snowflakes.length < MAX_SNOWFLAKES) {
        // Gera flocos constantemente
        createSnowflakeParticle();
    }
    
    // Atualiza a posição e rotação dos flocos
    snowflakes.forEach((snowflake, index) => {
        // Animação de queda
        snowflake.position.y -= snowflake.userData.speedY;
        
        // Simulação de vento (movimento sutil horizontal em onda)
        const wave = Math.sin(Date.now() * 0.001 + snowflake.userData.waveOffset);
        snowflake.position.x += snowflake.userData.windX + wave * 0.002;
        snowflake.position.z += snowflake.userData.windZ + wave * 0.002;
        
        // Verifica se o floco chegou ao chão (y <= 0)
        if (snowflake.position.y <= 0) {
            // Reposiciona o floco no topo para o efeito contínuo
            const worldRadius = worldSize * 0.9;
            snowflake.position.set(
                (Math.random() - 0.5) * worldRadius * 2,
                worldSize * 0.8,
                (Math.random() - 0.5) * worldRadius * 2
            );
        }
    });
}
// --- FIM DA LÓGICA DE FLOCOS DE NEVE CAINDO ---


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

// --- REMOVIDO: FUNÇÃO DE COLISÃO COM MONTANHA DE GELO ---
// A montanha foi movida para fora do mapa, então a colisão não é mais necessária.
/*
function checkCollision(object) {
    // ... (Lógica de colisão removida)
}
*/


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

    // ************* REMOVIDO: CHAMADA DE COLISÃO ***************
    // checkCollision(player); // Verifica a colisão com a Montanha de Gelo

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
    
    // Efeito de partícula (Ciano/Prata)
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
        
        // Efeito de partículas de depósito (Azul Gelo)
        createDepositParticles(machine.position);

        // Nivelamento
        checkLevelUp();
        
        updateUI();
    }
}

function createCollectParticle(position) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x40E0D0, transparent: true, opacity: 1 }); // Ciano Elétrico
    
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
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEFA, transparent: true, opacity: 1 }); // Azul Gelo
    
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

// --- NOVO: LÓGICA DE ZUMBIS (CONGELADOS) ---

function createZombie() {
    const zombieGroup = new THREE.Group();
    
    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEFA }); // Pele Azul Gelo
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0xAAAAAA }); // Camisa rasgada Cinza
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x4682B4 }); // Calça Azul Aço
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x00FFFF }); // Olhos Ciano Elétrico (Brilho do Gelo)
    
    // Cabeça
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMaterial);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    zombieGroup.add(head);

    // Olhos (Brilho no escuro)
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
            
            // Animação de braço (zumbi) - Mais lento e rígido (congelado)
            zombie.userData.armTimer += 0.05; // Metade da velocidade
            const swing = Math.sin(zombie.userData.armTimer) * 0.1; // Menos amplitude
            
            const leftArm = zombie.children.find(c => c.position.x < 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            const rightArm = zombie.children.find(c => c.position.x > 0 && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height === 1.0);
            
            if (leftArm && rightArm) {
                leftArm.rotation.x = swing;
                rightArm.rotation.x = -swing;
            }
            
            // Comportamento ATTACK (Próximo o suficiente)
            if (distanceToPlayer < ZOMBIE_ATTACK_RANGE) {
                // Lógica de ataque: causar dano, etc. (Apenas placeholder)
                // console.log("Zumbi Congelado atacando!");
            }
        }
    });
}

// --- FIM DA LÓGICA DE ZUMBIS (CONGELADOS) ---

// --- NOVO: LÓGICA DE GALINHAS (CONGELADAS) ---

function createChicken() {
    const chickenGroup = new THREE.Group();
    
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xECF0F1 }); // Corpo branco/prata (frio)
    const feetMaterial = new THREE.MeshLambertMaterial({ color: 0xE67E22 }); // Pés laranja
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
    
    // Detalhe de Gelo (opcional)
    const icePatch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0x87CEFA, transparent: true, opacity: 0.5 }));
    icePatch.position.set(0, 0.9, 0);
    chickenGroup.add(icePatch);
    
    chickenGroup.userData.isChicken = true;
    chickenGroup.userData.moveTimer = 0;
    chickenGroup.userData.targetPosition = new THREE.Vector3();
    chickenGroup.userData.moveSpeed = 0.01 + Math.random() * 0.01; // Mais lenta (congelada)
    
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
    chicken.userData.moveTimer = Math.random() * 100 + 150; // Tempo até o próximo movimento (maior, são mais lentas)
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
        
        // Animação de "pulo" sutil (muito sutil)
        chicken.position.y = 0.05 + Math.sin(Date.now() * 0.005 + chicken.userData.moveSpeed * 1000) * 0.02;
    });
}

// --- FIM DA LÓGICA DE GALINHAS (CONGELADAS) ---

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
    // Adicionado tratamento de erro para garantir que não pare o jogo
    if (coinsCarriedEl) coinsCarriedEl.textContent = `Moedas: ${coinsCarried}/${maxCarryCapacity}`;
    if (coinsStoredEl) coinsStoredEl.textContent = `Guardadas: ${coinsStored}`;
    
    // Atualiza o nível
    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = `Nível ${playerLevel}`;

    // Atualiza info do próximo nível
    const nextLevelInfoEl = document.getElementById('nextLevelInfo');
    if (nextLevelInfoEl) {
        if (playerLevel < levelRequirements.length) {
            nextLevelInfoEl.textContent = `Próximo nível: ${levelRequirements[playerLevel]} moedas`;
        } else {
            nextLevelInfoEl.textContent = `Nível máximo alcançado!`;
        }
    }
    
    // Atualiza a barra de experiência
    const expFillEl = document.getElementById('experienceFill');
    if (expFillEl) {
        if (playerLevel < levelRequirements.length) {
            const currentLevelExp = levelRequirements[playerLevel - 1];
            const nextLevelExp = levelRequirements[playerLevel];
            const expNeeded = nextLevelExp - currentLevelExp;
            const expProgress = experience - currentLevelExp;
            const progressPercent = (expProgress / expNeeded) * 100;
            expFillEl.style.width = `${progressPercent}%`;
        } else {
            expFillEl.style.width = `100%`;
        }
    }

    // Atualiza as estatísticas do jogador
    const statsElements = document.getElementById('playerStats') ? document.getElementById('playerStats').children : [];
    if (statsElements.length >= 3) {
        statsElements[0].textContent = `Velocidade: ${(playerSpeed / 0.06 * 100).toFixed(0)}%`;
        statsElements[1].textContent = `Capacidade: ${maxCarryCapacity} moedas`;
        statsElements[2].textContent = `Alcance: ${(collectionRange / 1.2 * 100).toFixed(0)}%`;
    }

    // Atualiza o cooldown do Dash
    const dashStatusEl = document.getElementById('dashStatus');
    const dashButton = document.getElementById('dashButton');
    if (dashStatusEl) {
        if (dashCooldown > 0) {
            const remainingTime = Math.ceil(dashCooldown / 1000);
            dashStatusEl.textContent = `Dash: ${remainingTime}s`;
            if (dashButton) {
                dashButton.textContent = `${remainingTime}s`;
                dashButton.classList.add('cooldown');
            }
        } else {
            dashStatusEl.textContent = 'Dash: Pronto';
            if (dashButton) {
                dashButton.textContent = '💨';
                dashButton.classList.remove('cooldown');
            }
        }
    }
    
    // Atualiza a dica da máquina
    const machineDistance = machine.position.distanceTo(player.position);
    nearMachine = machineDistance < machine.userData.interactionRadius;
    const machinePromptEl = document.getElementById('machinePrompt');
    
    if (machinePromptEl) {
        if (nearMachine && coinsCarried > 0) {
            machinePromptEl.textContent = 'Pressione ESPAÇO para guardar suas moedas!';
            machinePromptEl.style.display = 'block';
        } else if (nearMachine && coinsCarried === 0) {
            machinePromptEl.textContent = 'Colete moedas para guardar e evoluir!';
            machinePromptEl.style.display = 'block';
        } else {
            machinePromptEl.style.display = 'none';
        }
    }
}

function updateUILayout() {
    // Lógica para posicionamento da UI mobile
}


function startDash() {
    if (isDashing || dashCooldown > 0) return;

    isDashing = true;
    
    // Aplica um impulso instantâneo no vetor de velocidade
    const dashMultiplier = 2; // Impulso inicial
    playerVelocity.x *= dashMultiplier;
    playerVelocity.z *= dashMultiplier;
    
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
        updateSnowflakes(); // ATUALIZADO: Flocos de neve no lugar de folhas
        updateParticles(); 
        updateChickens(); 

        // Câmera segue o jogador
        if (controls) { 
            controls.target.copy(player.position);
            controls.update();
        }

        // Diminuir cooldown do dash
        if (dashCooldown > 0) {
            dashCooldown -= (1000 / 60); 
        }
    }

    if (renderer && scene && camera) { 
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
