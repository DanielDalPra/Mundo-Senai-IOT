(() => {
  "use strict";
  const live = new URLSearchParams(location.search).has("live");
  const $ = (id) => document.getElementById(id);
  const colors = { azul: 0x4658c9, verde: 0x319982, amarelo: 0xf2d527 };
  const colorNames = { azul: "Azul", verde: "Verde", amarelo: "Amarela" };
  const definitions = [
    ["CX-01", "azul", "A1"],
    ["CX-02", "verde", "A2"],
    ["CX-03", "azul", "A3"],
    ["CX-04", "amarelo", "B1"],
    ["CX-05", "azul", "B2"],
    ["CX-06", "verde", "B3"],
  ];
  const slots = ["A1", "A2", "A3", "B1", "B2", "B3"].map((id, i) => ({
    id,
    position: new THREE.Vector3(
      ((i % 3) - 1) * 11.2,
      i < 3 ? 23.2 : 10.2,
      -5.8,
    ),
  }));
  const slotById = Object.fromEntries(slots.map((s) => [s.id, s]));
  let selectedBox = "CX-01",
    selectedSlot = "A1",
    busy = false,
    drag = null,
    toastTimer,
    cameraTween = null;
  const motions = [];
  const boxData = [];
  const storageKey = "senai-estoque-maquete-v1";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1200);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: $("scene"),
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
  } catch (e) {
    $("error").classList.remove("hidden");
    $("error").textContent =
      "Não foi possível iniciar o 3D. Abra este arquivo no Chrome ou Edge com a aceleração gráfica habilitada.";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 48;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.target.set(0, 17, 0);
  scene.add(new THREE.HemisphereLight(0xe9f2ff, 0x798392, 0.65));
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.35);
  sun.position.set(-35, 85, 65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -65,
    right: 65,
    top: 65,
    bottom: -65,
    near: 1,
    far: 200,
  });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.12;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fillLight = new THREE.DirectionalLight(0xd9e6ff, 0.45);
  fillLight.position.set(55, 35, -45);
  scene.add(fillLight);
  const frontLight = new THREE.PointLight(0xe5edff, 0.45, 150);
  frontLight.position.set(0, 25, 45);
  scene.add(frontLight);
  const model = new THREE.Group();
  model.name = "Estoque_Inteligente";
  model.userData = {
    version: "1.0",
    reference: "Fotos fornecidas pelo grupo",
    dimensions: "Proporções aproximadas, sem medidas reais",
    units: "unidades de modelagem; exportação nominal em metros",
  };
  scene.add(model);
  const structure = new THREE.Group();
  structure.name = "Estrutura";
  model.add(structure);
  const rack = new THREE.Group();
  rack.name = "Estante";
  model.add(rack);
  const sensors = new THREE.Group();
  sensors.name = "Sensores_visuais";
  model.add(sensors);
  const packages = new THREE.Group();
  packages.name = "Caixas";
  model.add(packages);
  const slotGroup = new THREE.Group();
  slotGroup.name = "Vagas";
  model.add(slotGroup);
  const mat = (color, roughness = 0.78, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).convertSRGBToLinear(),
      roughness,
      metalness,
    });
  const blue = mat(0x345cc1),
    innerBlue = mat(0x304f9d),
    yellow = mat(0xf6d62c),
    navy = mat(0x1a2b49),
    asphalt = mat(0x303b4b),
    white = mat(0xe9edf3),
    silver = mat(0xb9c4d1, 0.3, 0.7),
    black = mat(0x101a25, 0.6),
    pcb = mat(0x2059a3),
    gold = mat(0xd7b85b, 0.5, 0.4);
  function cube(name, w, h, d, x, y, z, material, parent = structure) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.name = name;
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function rounded(name, w, h, d, r, x, y, z, material, parent) {
    const shape = new THREE.Shape();
    const a = -w / 2,
      b = -h / 2;
    shape.moveTo(a + r, b);
    shape.lineTo(a + w - r, b);
    shape.quadraticCurveTo(a + w, b, a + w, b + r);
    shape.lineTo(a + w, b + h - r);
    shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    shape.lineTo(a + r, b + h);
    shape.quadraticCurveTo(a, b + h, a, b + h - r);
    shape.lineTo(a, b + r);
    shape.quadraticCurveTo(a, b, a + r, b);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: false,
      curveSegments: 5,
      steps: 1,
    });
    geo.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geo, material);
    m.name = name;
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(name, r, depth, x, y, z, material, parent = sensors) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, depth, 32),
      material,
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    m.name = name;
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function canvasTexture(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    paint(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function label(
    name,
    text,
    w,
    h,
    x,
    y,
    z,
    color = "#204b9e",
    bg = null,
    parent = structure,
  ) {
    const tex = canvasTexture(1024, 128, (c, W, H) => {
      if (bg) {
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
      }
      c.font = "900 79px Arial";
      c.fillStyle = color;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, W / 2, H / 2, W - 24);
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: !bg,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  // Estrutura aberta na frente, baseada nas fotografias.
  rounded("Base_da_maquete", 73, 1.1, 58, 0.5, 0, -0.55, 5, asphalt, structure);
  cube("Piso_azul", 61, 0.8, 29, 0, 0.4, -4, blue);
  cube("Parede_traseira", 61, 35, 1, 0, 18, -18, innerBlue);
  cube("Parede_esquerda", 1, 35, 28, -30, 18, -4, blue);
  cube("Parede_direita", 1, 35, 28, 30, 18, -4, blue);
  cube("Pilar_esquerdo", 10, 32, 1.4, -25, 16.8, 10, blue);
  cube("Pilar_direito", 10, 32, 1.4, 25, 16.8, 10, blue);
  cube("Rodape_esquerdo", 10, 5.6, 0.2, -25, 3.6, 10.8, innerBlue);
  cube("Rodape_direito", 10, 5.6, 0.2, 25, 3.6, 10.8, innerBlue);
  cube("Travessa_superior", 61, 4.4, 1.3, 0, 33.3, 10, blue);
  const roof = cube("Teto_removivel", 61, 1, 29, 0, 36, -4, blue);
  // Letreiro com borda recortada, azul e amarelo como no original.
  const sign = new THREE.Group();
  sign.name = "Letreiro";
  structure.add(sign);
  rounded("Fundo_do_letreiro", 64, 6.8, 0.8, 1, 0, 37, 11.4, blue, sign);
  rounded("Placa_amarela", 62.8, 5.4, 0.25, 0.8, 0, 37, 11.92, yellow, sign);
  for (let i = 0; i < 16; i++) {
    const x = -29.8 + i * 3.97;
    for (const y of [34.2, 39.8]) {
      cylinder("Contorno_azul", 2.1, 0.7, x, y, 11.4, blue, sign);
      cylinder("Recorte_amarelo", 1.55, 0.25, x, y, 11.95, yellow, sign);
    }
  }
  label(
    "Texto_do_letreiro",
    "ESTOQUE INTELIGENTE",
    57,
    4.8,
    0,
    37,
    12.13,
    "#2854b0",
    null,
    sign,
  );
  // Faixas da área externa.
  for (const x of [-20, 20])
    cube("Faixa_lateral", 0.5, 0.04, 18, x, 0.025, 23, white);
  for (let z = 15; z < 33; z += 3.2)
    cube("Faixa_central", 0.45, 0.04, 1.8, 0, 0.025, z, white);
  // Estante de duas prateleiras.
  for (const x of [-18.4, 18.4]) {
    cube("Lateral_da_estante", 0.85, 28, 11.5, x, 14.8, -6.2, yellow, rack);
    cube("Pe_da_estante", 1.45, 0.7, 12.4, x, 1.15, -6.2, yellow, rack);
  }
  for (const y of [5.15, 18.15]) {
    rounded("Prateleira", 39, 0.85, 12.8, 0.22, 0, y, -6.1, yellow, rack);
    cube("Borda_da_prateleira", 39, 0.95, 0.55, 0, y, -0.05, yellow, rack);
  }
  cube("Travessa_traseira", 37, 0.9, 0.6, 0, 26, -11.7, yellow, rack);
  // Marcações virtuais discretas, uma por posição.
  for (const s of slots) {
    const node = new THREE.Group();
    node.name = "Vaga_" + s.id;
    node.position.copy(s.position);
    node.userData = { slotId: s.id };
    slotGroup.add(node);
    s.node = node;
    const marker = label(
      "Etiqueta_" + s.id,
      s.id,
      2.1,
      0.55,
      s.position.x,
      s.position.y - 5.15,
      0.28,
      "#6b5d18",
      null,
      rack,
    );
    s.marker = marker;
  }
  // Componentes da fachada são apenas elementos visuais.
  rounded("RC522", 5.7, 8, 0.28, 0.25, -25.1, 25.3, 11, pcb, sensors);
  for (let i = 0; i < 5; i++) {
    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(4.6 - i * 0.45, 4.2 - i * 0.4, 0.02),
    );
    const wire = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x89b0db }),
    );
    wire.position.set(-25.1, 26.3, 11.18);
    wire.name = "Antena_RFID";
    sensors.add(wire);
  }
  cube("Chip_RFID", 1.2, 1.3, 0.12, -25.1, 23.4, 11.25, black, sensors);
  label(
    "RFID_legenda",
    "RFID",
    4,
    0.6,
    -25,
    20.5,
    11.2,
    "#b9cdec",
    null,
    sensors,
  );
  rounded("TCS3200", 4.4, 4.3, 0.22, 0.2, -25.1, 12.5, 11, pcb, sensors);
  cube("Sensor_de_cor", 1.2, 1.2, 0.25, -25.1, 12.5, 11.3, black, sensors);
  for (const x of [-26.5, -23.7])
    for (const y of [11.1, 13.9])
      cylinder("LED_sensor", 0.36, 0.2, x, y, 11.25, white, sensors);
  rounded("OLED_moldura", 5.5, 3.3, 0.35, 0.4, 25.1, 28, 11.05, black, sensors);
  label(
    "OLED_indicador",
    "ESTOQUE",
    4.5,
    0.7,
    25.1,
    28.3,
    11.25,
    "#83bbd3",
    null,
    sensors,
  );
  label(
    "OLED_modo",
    live ? "REGISTRO" : "MANUAL",
    4.3,
    0.65,
    25.1,
    27.4,
    11.25,
    "#83bbd3",
    null,
    sensors,
  );
  cube("HC_SR04_placa", 7.3, 2.8, 0.25, 25.1, 21.8, 11, pcb, sensors);
  for (const x of [23, 27.2]) {
    cylinder("Ultrassonico_anel", 1.12, 0.8, x, 21.8, 11.45, silver);
    cylinder("Ultrassonico_malha", 0.81, 0.04, x, 21.8, 11.87, black);
    cylinder(
      "Ultrassonico_nucleo",
      0.57,
      0.045,
      x,
      21.8,
      11.9,
      mat(0x596675, 0.6, 0.2),
    );
  }
  const parkedPosition = (i) => new THREE.Vector3(-27.5 + i * 11, 5.1, 25);
  for (let i = 0; i < definitions.length; i++) {
    const [id, color, slot] = definitions[i],
      g = new THREE.Group();
    g.name = id.replace("-", "_");
    g.userData = { boxId: id, color, slotId: slot };
    packages.add(g);
    const material = mat(colors[color]);
    rounded("Corpo_" + id, 10.1, 9.2, 9.6, 0.15, 0, 0, 0, material, g);
    const lidmat = mat(
      new THREE.Color(colors[color]).lerp(new THREE.Color(0xffffff), 0.1),
    );
    cube("Tampa_" + id, 10.25, 0.18, 9.75, 0, 4.63, 0, lidmat, g);
    cube(
      "Dobra_da_tampa_" + id,
      0.055,
      0.025,
      9.6,
      0,
      4.74,
      0,
      mat(new THREE.Color(colors[color]).multiplyScalar(0.65)),
      g,
    );
    const tex = canvasTexture(256, 96, (c, W, H) => {
      c.fillStyle = "#e8ecdf";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#293548";
      c.font = "bold 26px Arial";
      c.fillText(id, 15, 31);
      for (let b = 0; b < 32; b++)
        c.fillRect(16 + b * 6, 46, b % 3 === 0 ? 3 : 1, 29);
    });
    const sticker = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.95),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
    );
    sticker.position.set(2.8, -2.5, 4.815);
    sticker.name = "Etiqueta_" + id;
    g.add(sticker);
    const data = { id, color, slot, home: slot, index: i, group: g };
    boxData.push(data);
    g.position.copy(slotById[slot].position);
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShadowMaterial({ opacity: 0.13 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.12;
  ground.receiveShadow = true;
  scene.add(ground);
  const selection = new THREE.BoxHelper(boxData[0].group, 0x82aee8);
  selection.material.depthTest = false;
  selection.material.transparent = true;
  selection.material.opacity = 0.8;
  selection.renderOrder = 10;
  scene.add(selection);
  const targetHighlight = new THREE.Mesh(
    new THREE.BoxGeometry(10.7, 0.1, 10.2),
    new THREE.MeshBasicMaterial({
      color: 0x7bb5f0,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  scene.add(targetHighlight);
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2();
  const occupant = (id) => boxData.find((b) => b.slot === id);
  const selected = () => boxData.find((b) => b.id === selectedBox);
  function notify(t) {
    $("toast").textContent = t;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3000);
  }
  function snapshot() {
    return {
      version: 1,
      boxes: boxData.map((b) => ({ id: b.id, color: b.color, slot: b.slot })),
    };
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshot()));
    } catch (e) {
      document.querySelector(".section:last-child .sub").textContent =
        "O navegador não permitiu salvar. Mantenha esta janela aberta.";
    }
    document.dispatchEvent(
      new CustomEvent("maquete:alterada", { detail: snapshot() }),
    );
  }
  function applySaved(value) {
    if (
      !value ||
      value.version !== 1 ||
      !Array.isArray(value.boxes) ||
      value.boxes.length !== 6
    )
      return false;
    const ids = new Set(),
      taken = new Set();
    for (const b of value.boxes) {
      if (
        !definitions.some((d) => d[0] === b.id) ||
        ids.has(b.id) ||
        !(b.slot === null || slotById[b.slot])
      )
        return false;
      ids.add(b.id);
      if (b.slot !== null) {
        if (taken.has(b.slot)) return false;
        taken.add(b.slot);
      }
    }
    for (const b of boxData) {
      b.slot = value.boxes.find((x) => x.id === b.id).slot;
      b.group.userData.slotId = b.slot;
      b.group.position.copy(
        b.slot ? slotById[b.slot].position : parkedPosition(b.index),
      );
    }
    return true;
  }
  if (!live) {
    try {
      applySaved(JSON.parse(localStorage.getItem(storageKey)));
    } catch (e) {}
  } else {
    applySaved({
      version: 1,
      boxes: definitions.map((d) => ({ id: d[0], slot: null })),
    });
  }
  function selectBox(id) {
    if (busy) return;
    selectedBox = id;
    const b = selected();
    if (b.slot) selectedSlot = b.slot;
    renderUI();
  }
  function selectSlot(id) {
    if (busy) return;
    selectedSlot = id;
    const b = occupant(id);
    if (b) selectedBox = b.id;
    renderUI();
  }
  function renderUI() {
    const count = boxData.filter((b) => b.slot).length;
    $("count").textContent = `${count} de 6 ocupadas`;
    $("fill").style.width = (count / 6) * 100 + "%";
    for (const s of slots) {
      const b = occupant(s.id),
        el = $("slot-" + s.id);
      if (!el) continue;
      el.setAttribute("aria-pressed", String(s.id === selectedSlot));
      el.setAttribute(
        "aria-label",
        `Vaga ${s.id}: ${b ? b.id + " " + colorNames[b.color] : "vazia"}`,
      );
      el.innerHTML = `<span class="swatch ${b ? "" : "empty"}" style="--box-color:${b ? "#" + colors[b.color].toString(16) : "transparent"}"></span><strong>${s.id}</strong><span>${b ? b.id : "Vazia"}</span>`;
      el.disabled = busy;
    }
    for (const b of boxData) {
      const el = $("box-" + b.id);
      if (el) {
        el.setAttribute("aria-pressed", String(b.id === selectedBox));
        el.setAttribute(
          "aria-label",
          `${b.id}, ${colorNames[b.color]}, ${b.slot ? "vaga " + b.slot : "fora da estante"}`,
        );
        el.disabled = busy;
      }
    }
    const b = selected();
    $("selected-name").textContent = b.id + " · " + colorNames[b.color];
    $("selected-location").textContent = b.slot
      ? "Vaga " + b.slot
      : "Área externa";
    const dest = occupant(selectedSlot);
    $("remove").disabled = live || busy || b.slot === null;
    $("place").disabled = live || busy || !!dest;
    $("place").textContent = "↑ Colocar em " + selectedSlot;
    $("action-hint").textContent = busy
      ? "Movendo a caixa…"
      : !dest
        ? `Coloque ${b.id} na vaga ${selectedSlot}.`
        : b.slot === selectedSlot
          ? "Retire a caixa selecionada para liberar esta vaga."
          : `A vaga ${selectedSlot} está ocupada. Escolha uma vaga vazia.`;
    $("reset").disabled = live || busy;
    $("export").disabled = busy;
    selection.setFromObject(b.group);
    const target = slotById[selectedSlot].position;
    targetHighlight.position.set(target.x, target.y - 4.65, target.z);
    targetHighlight.visible = !occupant(selectedSlot);
  }
  for (const s of slots) {
    const b = document.createElement("button");
    b.className = "slot";
    b.id = "slot-" + s.id;
    b.addEventListener("click", () => selectSlot(s.id));
    $(s.id[0] === "A" ? "upper-slots" : "lower-slots").appendChild(b);
  }
  for (const b of boxData) {
    const el = document.createElement("button");
    el.className = "boxchoice";
    el.id = "box-" + b.id;
    el.innerHTML = `<span class="dot" style="--box-color:#${colors[b.color].toString(16)}"></span>${b.id}`;
    el.addEventListener("click", () => selectBox(b.id));
    $("boxes").appendChild(el);
  }
  // Trajetória em etapas: sai pela frente, atravessa o corredor e entra na vaga.
  function animateMove(b, to) {
    const start = b.group.position.clone(),
      end = to ? slotById[to].position.clone() : parkedPosition(b.index);
    const route = [
      start,
      new THREE.Vector3(start.x, start.y, 18),
      new THREE.Vector3(end.x, end.y, 18),
      end,
    ];
    motions.push({ b, route, start: performance.now(), duration: 1150 });
    busy = true;
  }
  function moveBox(id, to) {
    if (busy || live) return false;
    const b = boxData.find((x) => x.id === id);
    if (
      !b ||
      !(to === null || slotById[to]) ||
      (to && occupant(to)) ||
      b.slot === to
    )
      return false;
    selectedBox = id;
    if (to) selectedSlot = to;
    animateMove(b, to);
    b.slot = to;
    b.group.userData.slotId = to;
    persist();
    renderUI();
    notify(to ? `${id} → vaga ${to}` : `${id} retirada da estante`);
    return true;
  }
  function reset() {
    if (busy || live) return;
    for (const b of boxData) {
      b.slot = b.home;
      b.group.position.copy(slotById[b.home].position);
      b.group.userData.slotId = b.home;
    }
    selectedBox = "CX-01";
    selectedSlot = "A1";
    persist();
    renderUI();
    notify("Disposição original restaurada");
  }
  let previousAspect = 0;
  function resize() {
    const el = $("scene");
    const w = el.clientWidth,
      h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (previousAspect && camera.position.length()) {
      const ratio =
        Math.max(1, 1.35 / camera.aspect) / Math.max(1, 1.35 / previousAspect);
      camera.position
        .sub(controls.target)
        .multiplyScalar(ratio)
        .add(controls.target);
    }
    previousAspect = camera.aspect;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe($("scene"));
  resize();
  function view(name, instant = false) {
    const narrow = camera.aspect < 1.1;
    const positions = {
      perspective: [narrow ? 78 : 65, narrow ? 48 : 40, narrow ? 145 : 116],
      front: [0, 22, narrow ? 165 : 132],
      top: [0, 134, narrow ? 70 : 48],
    };
    const to = new THREE.Vector3(...positions[name]);
    const target = new THREE.Vector3(0, 17, 0);
    if (instant) {
      camera.position.copy(to);
      controls.target.copy(target);
      controls.update();
    } else
      cameraTween = {
        from: camera.position.clone(),
        to,
        oldTarget: controls.target.clone(),
        target,
        start: performance.now(),
      };
    document
      .querySelectorAll(".toolbar button")
      .forEach((b) => b.classList.toggle("active", b.id === "view-" + name));
  }
  for (const id of ["perspective", "front", "top"])
    $("view-" + id).onclick = () => view(id);
  $("roof-toggle").onchange = (e) => {
    roof.visible = e.target.checked;
  };
  $("remove").onclick = () => moveBox(selectedBox, null);
  $("place").onclick = () => moveBox(selectedBox, selectedSlot);
  $("reset").onclick = () => $("reset-prompt").classList.toggle("hidden");
  $("reset-no").onclick = () => $("reset-prompt").classList.add("hidden");
  $("reset-yes").onclick = () => {
    $("reset-prompt").classList.add("hidden");
    reset();
  };
  function setRay(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
  }
  function hitBox(e) {
    setRay(e);
    const hit = raycaster.intersectObjects(packages.children, true)[0];
    if (!hit) return null;
    const obstruction = raycaster
      .intersectObjects(structure.children, true)
      .find((h) => h.object.visible && h.object.parent.visible);
    if (obstruction && obstruction.distance < hit.distance - 0.1) return null;
    let obj = hit.object;
    while (obj && obj !== packages) {
      if (obj.userData.boxId)
        return boxData.find((b) => b.id === obj.userData.boxId);
      obj = obj.parent;
    }
    return null;
  }
  function hitSlot(e) {
    setRay(e);
    const p = new THREE.Vector3();
    if (
      !raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 0, 1), 5.8),
        p,
      )
    )
      return null;
    return (
      slots.find(
        (s) =>
          Math.abs(p.x - s.position.x) < 5.5 &&
          Math.abs(p.y - s.position.y) < 5.3,
      ) || null
    );
  }
  function inDrop(e) {
    const r = $("dropzone").getBoundingClientRect();
    return (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    );
  }
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => {
      if (busy || live || e.button !== 0 || e.pointerType === "touch") return;
      const b = hitBox(e);
      if (!b) return;
      selectBox(b.id);
      controls.enabled = false;
      cameraTween = null;
      drag = {
        b,
        x: e.clientX,
        y: e.clientY,
        active: false,
        original: b.group.position.clone(),
        pointerId: e.pointerId,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
    },
    true,
  );
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6)
      drag.active = true;
    if (!drag.active) return;
    $("dropzone").classList.add("active");
    $("dropzone").classList.toggle("over", inDrop(e));
    const s = hitSlot(e);
    if (s && !occupant(s.id)) {
      selectedSlot = s.id;
      renderUI();
    }
    setRay(e);
    const p = new THREE.Vector3();
    if (
      raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -18),
        p,
      )
    ) {
      p.y = Math.max(5, Math.min(45, p.y));
      p.x = Math.max(-40, Math.min(40, p.x));
      drag.b.group.position.copy(p);
      selection.setFromObject(drag.b.group);
    }
    renderer.domElement.style.cursor = "grabbing";
  });
  function endDrag(e, cancel = false) {
    if (!drag) return;
    const d = drag,
      drop = inDrop(e);
    drag = null;
    d.b.group.position.copy(d.original);
    controls.enabled = true;
    renderer.domElement.style.cursor = "";
    $("dropzone").classList.remove("active", "over");
    if (d.active && !cancel) {
      const s = hitSlot(e);
      if (drop) {
        if (!moveBox(d.b.id, null))
          notify("Esta caixa já está fora da estante.");
      } else if (s && !occupant(s.id)) {
        moveBox(d.b.id, s.id);
      } else
        notify(
          s
            ? "Vaga ocupada. Escolha uma vaga vazia."
            : "Solte sobre uma vaga vazia ou na área de retirada.",
        );
    }
    renderUI();
  }
  renderer.domElement.addEventListener("pointerup", (e) => endDrag(e));
  renderer.domElement.addEventListener("pointercancel", (e) =>
    endDrag(e, true),
  );
  let touchStart = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") touchStart = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (
      e.pointerType === "touch" &&
      touchStart &&
      Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) < 8
    ) {
      const b = hitBox(e);
      if (b) selectBox(b.id);
      else {
        const s = hitSlot(e);
        if (s) selectSlot(s.id);
      }
    }
    touchStart = null;
  });
  controls.addEventListener("start", () => {
    cameraTween = null;
    document
      .querySelectorAll(".toolbar button")
      .forEach((b) => b.classList.remove("active"));
  });
  // GLB em escala nominal: não é um desenho de fabricação.
  function exportGLB() {
    return new Promise((resolve, reject) => {
      try {
        const copy = model.clone(true);
        copy.scale.setScalar(0.01);
        copy.traverse((o) => {
          if (o.name === "Teto_removivel") o.visible = true;
        });
        copy.userData.scaleNote =
          "1 unidade original = 0.01 m; escala nominal não aferida";
        new THREE.GLTFExporter().parse(copy, (result) => resolve(result), {
          binary: true,
          onlyVisible: true,
          trs: true,
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  function download(data, name, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  $("export").onclick = async () => {
    if (busy) return;
    $("export").disabled = true;
    try {
      download(
        await exportGLB(),
        "estoque-inteligente.glb",
        "model/gltf-binary",
      );
      notify("Modelo 3D exportado com as posições atuais.");
    } catch (e) {
      notify("Não foi possível exportar o modelo. Tente novamente.");
      console.error(e);
    } finally {
      renderUI();
    }
  };
  window.maquete = {
    atualizarEstado: (state) => {
      if (!live) return false;
      const ok = applySaved(state);
      if (ok) renderUI();
      return ok;
    },
    getState: snapshot,
    retirar: (id) => moveBox(id, null),
    colocar: (id, slot) => moveBox(id, slot),
    selecionarCaixa: selectBox,
    selecionarVaga: selectSlot,
    restaurar: reset,
    exportGLB,
    get busy() {
      return busy;
    },
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drag) endDrag(e, true);
  });
  if (live) {
    document.querySelector(".badge").textContent = "Estoque registrado";
    document.querySelector(".stage-note").textContent =
      "Arraste para girar · Role para aproximar";
  }
  view("perspective", true);
  renderUI();
  function frame(now) {
    requestAnimationFrame(frame);
    if (cameraTween) {
      const t = Math.min(1, (now - cameraTween.start) / 650),
        ease = t * t * (3 - 2 * t);
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, ease);
      controls.target.lerpVectors(
        cameraTween.oldTarget,
        cameraTween.target,
        ease,
      );
      if (t === 1) cameraTween = null;
    }
    for (let i = motions.length - 1; i >= 0; i--) {
      const m = motions[i],
        t = Math.min(1, (now - m.start) / m.duration),
        part = Math.min(2, Math.floor(t * 3)),
        u = Math.min(1, t * 3 - part),
        v = u * u * (3 - 2 * u);
      m.b.group.position.lerpVectors(m.route[part], m.route[part + 1], v);
      if (t === 1) {
        motions.splice(i, 1);
        busy = false;
        renderUI();
      }
    }
    controls.update();
    selection.setFromObject(selected().group);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
