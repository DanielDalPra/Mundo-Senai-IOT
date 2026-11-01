const $ = (id) => document.getElementById(id);
const slots = ["A1", "A2", "A3", "B1", "B2", "B3"];
const colors = { azul: "#4658c9", verde: "#319982", amarelo: "#e8cc20" };
let state = null,
  stream = null,
  connected = false,
  feedbackTimer,
  clockOffset = 0;
const now = () => Date.now() + clockOffset;
const say = (text) => {
  $("feedback").textContent = text;
  $("feedback").classList.add("show");
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(
    () => $("feedback").classList.remove("show"),
    4500,
  );
};
async function api(path, method = "GET", data) {
  const res = await fetch("/api/" + path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const value = await res.json();
  if (res.status === 401) {
    $("login-layer").hidden = false;
    connected = false;
    stream?.close();
  }
  if (!res.ok) throw Error(value.error || "Falha de comunicação.");
  return value;
}
function textElement(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}
for (const name of ["operation-box", "tag-box", "fix-box"])
  for (let i = 1; i <= 6; i++) {
    $(name).add(new Option("CX-0" + i, "CX-0" + i));
  }
for (const s of slots) {
  $("slot").add(new Option(s, s));
  $("fix-slot").add(new Option(s, s));
}
document.querySelectorAll("nav button").forEach(
  (button) =>
    (button.onclick = () => {
      document
        .querySelectorAll("nav button")
        .forEach((b) => b.classList.toggle("active", b === button));
      document
        .querySelectorAll(".tab")
        .forEach((p) => (p.hidden = p.id !== button.dataset.tab));
    }),
);
function drawConnection() {
  const online = state?.device && now() - state.device.lastSeen < 10000;
  $("connection").textContent = !connected
    ? "Servidor desconectado"
    : online
      ? "ESP32 conectado"
      : "ESP32 sem comunicação";
  $("connection").className =
    "status " + (connected && online ? "online" : "offline");
  if (!online || !connected)
    for (const id of ["presence", "distance", "color", "rssi"])
      $(id).textContent = "—";
  return online;
}
function updateOperation() {
  if (!state) return;
  const b = state.boxes.find((b) => b.id === $("operation-box").value),
    action = $("action").value;
  const active = state.command && state.command.expiresAt > now();
  $("slot-label").hidden = action === "saida";
  for (const option of $("slot").options) {
    const taken = state.boxes.some((b) => b.slot === option.value);
    option.disabled = taken;
    option.textContent = option.value + (taken ? " · ocupada" : " · livre");
  }
  if ($("slot").selectedOptions[0]?.disabled) {
    const available = [...$("slot").options].find((o) => !o.disabled);
    $("slot").value = available?.value || "";
  }
  let reason =
    "Prepare a leitura e aguarde aparecer no OLED antes de aproximar a caixa.";
  let invalid = false;
  if (!connected) {
    reason = "Reconecte ao servidor para operar.";
    invalid = true;
  } else if (!drawConnection()) {
    reason =
      "Ligue o ESP32 e confira a ponte USB ou a configuração do Wi-Fi.";
    invalid = true;
  } else if (state.device?.telemetry.rfidOk === false) {
    reason = "RFID sem resposta. Confira as ligações do RC522 antes de cadastrar tags ou operar.";
    invalid = true;
  } else if (!b.uid) {
    reason = "Cadastre a tag desta caixa na aba Tags.";
    invalid = true;
  } else if (action === "entrada" && b.slot) {
    reason = "Esta caixa já está no estoque. Use saída ou mudar de vaga.";
    invalid = true;
  } else if (action !== "entrada" && !b.slot) {
    reason = "Esta caixa está fora do estoque. Use entrada.";
    invalid = true;
  } else if (action !== "saida" && !$("slot").value) {
    reason = "Não há vaga livre.";
    invalid = true;
  }
  $("prepare").disabled = invalid || !!active;
  $("operation-help").textContent = reason;
  $("pending").hidden = !active;
  if (active) {
    $("pending-title").textContent =
      state.command.boxId + " · " + state.command.action;
    $("pending-detail").textContent =
      `${state.command.slot ? "Destino " + state.command.slot : "Retirada do estoque"} · ${Math.max(0, Math.ceil((state.command.expiresAt - now()) / 1000))} s para apresentar a tag.`;
  }
}
function syncModel() {
  const m = $("model").contentWindow?.maquete;
  if (m && state)
    m.atualizarEstado({
      version: 1,
      boxes: state.boxes.map((b) => ({ id: b.id, slot: b.slot })),
    });
}
function render(next) {
  state = next;
  clockOffset = state.serverTime - Date.now();
  drawConnection();
  $("occupancy").textContent =
    state.boxes.filter((b) => b.slot).length + " / 6 vagas";
  const t = state.device?.telemetry,
    online = state.deviceOnline;
  $("presence").textContent = online
    ? t.present
      ? "Caixa presente"
      : "Livre"
    : "—";
  $("distance").textContent =
    online && t.distanceCm !== null ? t.distanceCm.toFixed(1) + " cm" : "—";
  $("color").textContent = online ? t.color : "—";
  $("rssi").textContent = online ? t.transport === "usb" ? "USB" : t.rssi + " dBm" : "—";
  $("inventory").replaceChildren();
  $("tag-list").replaceChildren();
  for (const b of state.boxes) {
    const row = document.createElement("div");
    row.className = "inv-row";
    const dot = document.createElement("i");
    dot.className = "dot";
    dot.style.setProperty("--color", colors[b.color]);
    row.append(
      dot,
      textElement("strong", b.id),
      textElement("small", b.uid ? "Tag vinculada" : "Sem tag"),
      textElement("span", b.slot || "Fora"),
    );
    $("inventory").append(row);
    $("tag-list").append(
      textElement("div", b.id + " · " + (b.uid || "não cadastrada")),
    );
  }
  $("last-uid").textContent = state.lastScan?.uid || "Nenhuma leitura";
  $("last-result").textContent = state.lastScan
    ? new Date(state.lastScan.at).toLocaleTimeString("pt-BR") +
      " · " +
      state.lastScan.result.message
    : "Aproxime a etiqueta do RC522.";
  $("events").replaceChildren();
  for (const e of state.history) {
    const li = document.createElement("li");
    const time = textElement("time", new Date(e.at).toLocaleString("pt-BR"));
    li.append(time, textElement("span", e.message));
    $("events").append(li);
  }
  updateOperation();
  syncModel();
}
async function start() {
  try {
    render(await api("state"));
    $("login-layer").hidden = true;
    connected = true;
    stream?.close();
    stream = new EventSource("/api/events");
    stream.onmessage = (e) => {
      connected = true;
      render(JSON.parse(e.data));
    };
    stream.onerror = () => {
      connected = false;
      drawConnection();
      updateOperation();
    };
    updateOperation();
  } catch (e) {
    $("login-error").textContent = e.message;
  }
}
$("login-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("login", "POST", { token: $("admin-key").value });
    $("admin-key").value = "";
    $("login-error").textContent = "";
    await start();
  } catch (e) {
    $("login-error").textContent = e.message;
  }
};
$("logout").onclick = async () => {
  try {
    await api("logout", "POST");
  } catch {}
  stream?.close();
  $("login-layer").hidden = false;
  connected = false;
  drawConnection();
};
$("operation-box").onchange = updateOperation;
$("action").onchange = updateOperation;
$("operation-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("command", "POST", {
      boxId: $("operation-box").value,
      action: $("action").value,
      slot: $("action").value === "saida" ? null : $("slot").value,
    });
    say("Aguarde a operação aparecer no OLED. Depois apresente a caixa.");
  } catch (e) {
    say(e.message);
  }
};
$("cancel").onclick = async () => {
  try {
    await api("command", "DELETE");
    say("Operação cancelada.");
  } catch (e) {
    say(e.message);
  }
};
$("use-last").onclick = () => {
  if (state?.lastScan) $("tag-uid").value = state.lastScan.uid;
  else say("Nenhuma tag foi lida ainda.");
};
$("tag-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("tags", "POST", {
      boxId: $("tag-box").value,
      uid: $("tag-uid").value,
    });
    say("Tag cadastrada. Retire a caixa antes da próxima leitura.");
    $("tag-uid").value = "";
  } catch (e) {
    say(e.message);
  }
};
$("reconcile-form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("reconcile", "POST", {
      boxId: $("fix-box").value,
      slot: $("fix-slot").value || null,
      reason: $("reason").value,
    });
    say("Correção registrada no histórico.");
    $("reason").value = "";
  } catch (e) {
    say(e.message);
  }
};
$("model").onload = syncModel;
setInterval(() => {
  if (state) {
    drawConnection();
    updateOperation();
  }
}, 1000);
start();
