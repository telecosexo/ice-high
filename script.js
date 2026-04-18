/**
 * =============================================================================
 * CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
 * =============================================================================
 */
const firebaseConfig = {
    apiKey: "AIzaSyBmfbbuI02_UFirRXRGSmo0fU9ZekQ2Egw",
    authDomain: "trojan-stats.firebaseapp.com",
    projectId: "trojan-stats",
    storageBucket: "trojan-stats.firebasestorage.app",
    messagingSenderId: "826944316857",
    appId: "1:826944316857:web:143f3519b5b70134fb4268"
};

try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    console.log("✅ Firebase conectado com sucesso.");
} catch (error) {
    console.error("❌ Erro ao conectar no Firebase:", error);
}

/**
 * =============================================================================
 * CONSTANTES GLOBAIS E DADOS
 * =============================================================================
 */
const CONFIG = {
    WEBHOOKS: {
        ACOES: "https://discord.com/api/webhooks/1438189798849384560/lote5LpQxF80SDUZ3QdPOj2aHiQ7JtcJWKfTNxErKA0MjhDdQ86vruN74dnNUy0YMowD",
        VENDAS: "https://discord.com/api/webhooks/1492194338057355334/HrQ9JV5le5NT_W8-qRV37bR9ZeeLkjRPWBtg3gs1iqMF3sAZdTJlOoVwtm0B59HeRuMi",
        LAVAGEM: "https://discord.com/api/webhooks/1492193244464025641/TtZKG1ThamllzY_O3fucPRL5PwMTIXtAH1kwdhwQNpTqOwYMJNsvgXs4Z3Aq3M06_XV3",
        LOGS_ACOES: "https://discord.com/api/webhooks/1492192766950637658/JukRqHmhJfLtnO-79qbU2q7alf0pSx2bldLMRyfZEF9R6Kfu4BrFwMr7pXKRIILedSlA",
        LOGS_VENDAS: "https://discord.com/api/webhooks/1492193145939562710/sGl8iLc3WFaZxg0Gzj-aEzYadbTPOrej2xVGBxIwRiYCL_uVpWw40BocIdj8VoA9-INq"
    },
    TAXA_MAQUINA: 10,
    MAT_NAMES: ["Componente Eletrônico", "Borracha", "Alvejante"],
    MAT_WEIGHTS: [0.1, 0, 0.05]
};

const CATALOG = {
    'pendrive_1': { name: "Pendrive 1",     category: "Pendrives", price: { min: 2500, max: 2500 }, weight: 0.5,  cost: 0, recipe: [12, 8, 0, 0] },
    'pendrive_2': { name: "Pendrive 2",     category: "Pendrives", price: { min: 5000, max: 5000 }, weight: 0.5,  cost: 0, recipe: [14, 10, 0, 0] },
    'pendrive_3': { name: "Pendrive 3",     category: "Pendrives", price: { min: 8500, max: 8500 }, weight: 0.5,  cost: 0, recipe: [19, 15, 0, 0] },
    'pendrive_4': { name: "Pendrive 4",     category: "Pendrives", price: { min: 11000, max: 11000 }, weight: 0.5,  cost: 0, recipe: [27, 23, 0, 0] },
    'pendrive_5': { name: "Pendrive 5",     category: "Pendrives", price: { min: 25000, max: 25000 }, weight: 0.5,  cost: 0, recipe: [40, 30, 0, 0] },
    'algema':     { name: "Algema",         category: "Utilidades", price: { min: 3500, max: 3500 },  weight: 1.0,  cost: 0, recipe: [0, 0, 0, 0] },
    'alcool':     { name: "Álcool em Gel",  category: "Utilidades", price: { min: 1850, max: 1850 },  weight: 0.3,  cost: 0, recipe: [0, 0, 0, 0] }
};

/**
 * =============================================================================
 * APLICAÇÃO PRINCIPAL
 * =============================================================================
 */
const app = {
    state: {
        participants: new Set(),
        cart: [],
        selectedItemId: null,
        globalPriceType: 'max',
        tutorialActive: false,
        tutorialStepIndex: 0,
        isAdmin: false
    },
    dom: {},

    init() {
        this.cacheDOM();
        this.setDefaults();
        this.renderCatalog();
    },

    cacheDOM() {
        const ids = [
            'acao-tipo', 'acao-data', 'acao-hora', 'novo-participante', 'lista-participantes',
            'venda-vendedor', 'venda-faccao', 'venda-data', 'venda-hora', 'venda-preco', 'venda-qtd',
            'sales-catalog', 'price-controls', 'select-msg', 'cart-items', 'cart-summary-area',
            'cart-production-area', 'mats-list-display', 'sales-production-details',
            'total-mat-weight-display', 'total-prod-weight-display',
            'toast-container',
            'tutorial-box', 'tut-title', 'tut-text', 'tut-progress', 'btn-tut-prev',
            'stat-total-vendas', 'stat-faturamento', 'stat-total-itens', 'stats-top-itens', 'stat-total-bruto',
            'filtro-inicio', 'filtro-fim'
        ];
        ids.forEach(id => this.dom[id] = document.getElementById(id));
    },

    setDefaults() {
        const now = new Date();
        const dateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' 
        }).format(now);
        
        const timeStr = new Intl.DateTimeFormat('pt-BR', { 
            timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
        }).format(now);

        ['acao', 'venda', 'lavagem'].forEach(prefix => {
            const d = document.getElementById(`${prefix}-data`);
            const t = document.getElementById(`${prefix}-hora`);
            if (d) d.value = dateStr;
            if (t) t.value = timeStr;
        });

        const firstDayStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' 
        }).format(new Date(now.getFullYear(), now.getMonth(), 1));

        if (this.dom['filtro-inicio']) this.dom['filtro-inicio'].value = firstDayStr;
        if (this.dom['filtro-fim']) this.dom['filtro-fim'].value = dateStr;
    },

    switchTab(tabId, event) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        if (event) event.currentTarget.classList.add('active');
        if (tabId === 'estatisticas' && this.state.isAdmin) this.loadDashboard();
    },

    toggleAdmin() {
        if (this.state.isAdmin) return;
        this.state.isAdmin = true;
        this.showToast("🔓 Modo Admin Ativado!");

        const nav = document.getElementById('nav-menu');
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.innerText = '📊 Estatísticas';
        btn.onclick = (e) => app.switchTab('estatisticas', e);
        nav.insertBefore(btn, nav.lastElementChild);
        this.loadDashboard();
    },

    copyAdText(el) {
        navigator.clipboard.writeText(el.innerText).then(() => this.showToast("Copiado!"));
    },

    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerText = msg;
        this.dom['toast-container'].appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    formatDate(d) {
        if (!d) return '';
        const [y, m, d2] = d.split('-');
        return `${d2}/${m}/${y}`;
    },

    renderCatalog() {
        const grouped = {};
        const categories = ["Pendrives", "Utilidades"];
        
        Object.entries(CATALOG).forEach(([id, item]) => {
            const cat = item.category || "Outros";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ ...item, id });
        });

        let htmlBuffer = '';
        categories.forEach(cat => {
            if (grouped[cat]) {
                htmlBuffer += `<div class="catalog-category-title collapsed" onclick="app.toggleCategory(this)">${cat}</div><div class="grid-list-small hidden">`;
                grouped[cat].forEach(item => {
                    htmlBuffer += `
                    <div class="catalog-item" data-id="${item.id}" onclick="app.selectItem('${item.id}')">
                        <div class="cat-name">${item.name}</div>
                        <div class="cat-prices">
                            <span class="price-tag min">R$ ${item.price.min / 1000}k</span>
                            <span class="price-separator">|</span>
                            <span class="price-tag max">R$ ${item.price.max / 1000}k</span>
                        </div>
                    </div>`;
                });
                htmlBuffer += `</div>`;
            }
        });
        
        const el = this.dom['sales-catalog'];
        if (el) el.innerHTML = htmlBuffer;
    },

    toggleCategory(el) {
        el.classList.toggle('collapsed');
        const content = el.nextElementSibling;
        if (content) content.classList.toggle('hidden');
    },

    selectItem(id) {
        this.state.selectedItemId = id;
        document.querySelectorAll('.catalog-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector(`.catalog-item[data-id="${id}"]`);
        if (el) el.classList.add('selected');
        
        this.dom['price-controls'].classList.remove('hidden-controls');
        this.dom['select-msg'].style.display = 'none';
        this.dom['venda-preco'].value = CATALOG[id].price[this.state.globalPriceType];
        this.dom['venda-qtd'].value = 1;
    },

    updateGlobalPriceType(type) {
        this.state.globalPriceType = type;
        const typeName = type === 'min' ? 'Parceria' : 'Pista';
        
        if (this.state.selectedItemId) {
            this.dom['venda-preco'].value = CATALOG[this.state.selectedItemId].price[type];
        }
        
        if (this.state.cart.length > 0) {
            this.state.cart.forEach(item => {
                item.price = CATALOG[item.id].price[type];
                item.total = item.price * item.qtd;
            });
            this.renderCart();
            if (!this.dom['cart-production-area'].classList.contains('hidden')) {
                this.calculateCartProduction();
            }
            this.showToast(`Preços atualizados para ${typeName}`);
        }
    },

    validateInput(el) {
        let val = parseInt(el.value);
        if (isNaN(val) || val < 1) el.value = 1;
    },

    adjustSalesQtd(n) {
        const el = this.dom['venda-qtd'];
        let val = parseInt(el.value) || 1;
        val += n;
        if (val < 1) val = 1;
        el.value = val;
    },

    addToCart() {
        const id = this.state.selectedItemId;
        if (!id) return this.showToast('Selecione uma arma', 'error');
        
        const price = parseFloat(this.dom['venda-preco'].value) || 0;
        const qtd = parseInt(this.dom['venda-qtd'].value) || 1;
        
        if (price === 0) return this.showToast('Preço inválido', 'error');
        
        const item = CATALOG[id];
        this.state.cart.push({
            id: id,
            name: item.name,
            price: price,
            qtd: qtd,
            total: price * qtd,
            weight: item.weight,
            cost: item.cost,
            recipe: item.recipe
        });
        
        this.renderCart();
        this.showToast('Item adicionado!');
        this.dom['cart-production-area'].classList.add('hidden');
    },

    adjustCartQtd(idx, n) {
        const item = this.state.cart[idx];
        if (item.qtd + n < 1) return;
        item.qtd += n;
        item.total = item.price * item.qtd;
        this.renderCart();
        if (!this.dom['cart-production-area'].classList.contains('hidden')) {
            this.calculateCartProduction();
        }
    },

    removeFromCart(idx) {
        this.state.cart.splice(idx, 1);
        this.renderCart();
        this.dom['cart-production-area'].classList.add('hidden');
    },

    clearCart() {
        this.state.cart = [];
        this.renderCart();
        this.dom['cart-production-area'].classList.add('hidden');
    },

    renderCart() {
        const container = this.dom['cart-items'];
        if (this.state.cart.length === 0) {
            container.innerHTML = '<p class="empty-msg">Carrinho vazio</p>';
            this.dom['cart-summary-area'].innerHTML = '';
            return;
        }

        let html = '', grandTotal = 0, totalProdCost = 0;
        this.state.cart.forEach((item, idx) => {
            grandTotal += item.total;
            totalProdCost += (item.cost * item.qtd);
            html += `
            <div class="cart-item">
                <div class="cart-item-title">${item.name} <span class="badge-count-small">x${item.qtd}</span></div>
                <div class="cart-controls-row">
                    <div class="qty-selector-sm">
                        <button class="btn-qty-sm" onclick="app.adjustCartQtd(${idx}, -1)">-</button>
                        <span class="qty-display-sm">${item.qtd}</span>
                        <button class="btn-qty-sm" onclick="app.adjustCartQtd(${idx}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">R$ ${item.total.toLocaleString('pt-BR')}</div>
                </div>
                <div class="btn-remove-item" onclick="app.removeFromCart(${idx})">&times;</div>
            </div>`;
        });

        container.innerHTML = html;
        
        // --- NOVA MATEMÁTICA: ABATE O CUSTO PRIMEIRO E DIVIDE O LUCRO ---
        const lucroLiquido = grandTotal - totalProdCost;
        const valorVendedor = lucroLiquido * 0.40; // 40% para o vendedor
        const faccaoNet = lucroLiquido * 0.60;     // 60% para a facção

        this.dom['cart-summary-area'].innerHTML = `
        <div class="cart-summary-box">
            <div class="summary-total">💸 Total: R$ ${grandTotal.toLocaleString('pt-BR')}</div>
            <div class="summary-seller">💰 Vendedor (40% do Lucro): R$ ${valorVendedor.toLocaleString('pt-BR')}</div>
            <div class="summary-faction">🔥 Facção (60% do Lucro): R$ ${faccaoNet.toLocaleString('pt-BR')}</div>
        </div>`;
    },

    calculateCartProduction() {
        if (this.state.cart.length === 0) return this.showToast('Carrinho vazio!', 'error');
        
        const totalMats = [0, 0, 0, 0];
        let totalMatWeight = 0, totalProdWeight = 0, detailsHTML = "";

        this.state.cart.forEach(item => {
            totalProdWeight += item.weight * item.qtd;
            if (item.recipe) {
                const crafts = item.qtd; // Agora é 1 produto por craft
                let itemMatsHTML = "";
                item.recipe.forEach((qtd, i) => {
                    const totalM = qtd * crafts;
                    totalMats[i] += totalM;
                    totalMatWeight += totalM * CONFIG.MAT_WEIGHTS[i];
                    if (totalM > 0) itemMatsHTML += `<div class="mat-item-tiny"><span>${CONFIG.MAT_NAMES[i]}:</span> <b>${totalM}</b></div>`;
                });
                detailsHTML += `
                <div class="detail-card-small">
                    <div class="detail-header-small"><span class="detail-name">${item.name}</span><span class="badge-count-small">x${item.qtd}</span></div>
                    <div class="mats-grid-small">${itemMatsHTML}</div>
                </div>`;
            }
        });

        let matsHtml = totalMats.map((t, i) => i !== 3 && t > 0 ? `<div class="mat-tag-pill"><span>${CONFIG.MAT_NAMES[i]}:</span> <b>${t}</b></div>` : '').join('');
        if (totalMats[3] > 0) matsHtml += `<div class="mat-tag-pill project-tag"><span>Projeto:</span> <b>${totalMats[3]}</b></div>`;

        this.dom['mats-list-display'].innerHTML = matsHtml;
        this.dom['sales-production-details'].innerHTML = detailsHTML;
        this.dom['total-mat-weight-display'].innerText = totalMatWeight.toFixed(2).replace('.', ',') + ' kg';
        this.dom['total-prod-weight-display'].innerText = totalProdWeight.toFixed(2).replace('.', ',') + ' kg';

        const area = this.dom['cart-production-area'];
        area.classList.remove('hidden');
        area.scrollIntoView({ behavior: 'smooth' });
    },

    closeProduction() {
        this.dom['cart-production-area'].classList.add('hidden');
    },

    addParticipant() {
        const val = this.dom['novo-participante'].value.trim();
        if (!val) return;
        if (this.state.participants.has(val)) return;
        this.state.participants.add(val);
        this.renderParticipants();
        this.dom['novo-participante'].value = "";
    },
    removeParticipant(val) {
        this.state.participants.delete(val);
        this.renderParticipants();
    },
    renderParticipants() {
        let html = '';
        this.state.participants.forEach(p => html += `<div class="chip">${p} <span onclick="app.removeParticipant('${p}')">&times;</span></div>`);
        this.dom['lista-participantes'].innerHTML = html;
    },
    handleEnterParticipant(e) {
        if (e.key === 'Enter') this.addParticipant();
    },

    async sendWebhook(url, payload, msg, cb) {
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (msg) this.showToast(msg);
            if (cb) cb();
        } catch (e) {
            console.error(e);
            this.showToast("Erro de conexão", "error");
        }
    },

    sendActionWebhook() {
        const tipo = this.dom['acao-tipo'].value;
        if (!tipo) return this.showToast("Selecione o local", "error");

        const resultado = document.querySelector('input[name="resultado"]:checked')?.value;
        if (!resultado) return this.showToast("Selecione o resultado", "error");

        const dataF = this.formatDate(this.dom['acao-data'].value);
        const hora = this.dom['acao-hora'].value;
        const parts = Array.from(this.state.participants).join('\n> • ');
        const color = resultado === 'Vitória' ? 3066993 : 15158332;

        const embedMainAcao = {
            username: "IceHelper",
            embeds: [{
                title: `⚔️ Registro de Ação: ${tipo}`,
                color: color,
                fields: [
                    { name: "Resultado", value: `**${resultado.toUpperCase()}**`, inline: true },
                    { name: "Motivo", value: "Ação Blipada", inline: true },
                    { name: "Data/Hora", value: `${dataF} às ${hora}`, inline: false },
                    { name: "Participantes", value: parts ? `> • ${parts}` : "> Ninguém registrado" }
                ]
            }]
        };

        // 1. Envio Principal
        this.sendWebhook(CONFIG.WEBHOOKS.ACOES, embedMainAcao, "Ação registrada!", () => {
            this.state.participants.clear();
            this.renderParticipants();
        });

        // 2. Envio Log Resumido
        if (CONFIG.WEBHOOKS.LOGS_ACOES) {
            const embedLogAcao = {
                username: "Ice Log",
                embeds: [{
                    color: color,
                    description: `**Ação:** ${tipo}\n**Data:** ${dataF}\n**Hora:** ${hora}\n**Motivo:** Ação Blipada\n**Resultado:** ${resultado}`
                }]
            };
            this.sendWebhook(CONFIG.WEBHOOKS.LOGS_ACOES, embedLogAcao);
        }
    },

    async sendSaleWebhook() {
        if (this.state.cart.length === 0) return this.showToast('Carrinho vazio!', 'error');
        
        const dataInput = this.dom['venda-data'].value;
        const horaInput = this.dom['venda-hora'].value;
        const itensCopia = [...this.state.cart]; 
        
        // --- CÁLCULO PARA O BANCO DE DADOS E DISCORD ---
        const totalVenda = this.state.cart.reduce((a, b) => a + b.total, 0);
        const custoTotal = this.state.cart.reduce((acc, item) => acc + (item.cost * item.qtd), 0);
        
        // Subtrai o custo do total para achar o lucro real, depois divide em 40/60
        const lucroLiquidoTotal = totalVenda - custoTotal;
        const valorVendedor = lucroLiquidoTotal * 0.40; // 40% para o vendedor
        const lucroFaccao = lucroLiquidoTotal * 0.60;   // 60% para a facção

        const vendaData = {
            vendedor: this.dom['venda-vendedor'].value,
            faccao: this.dom['venda-faccao'].value,
            itens: itensCopia,
            data: new Date(`${dataInput}T${horaInput}`),
            total: totalVenda,
            lucroFaccao: lucroFaccao,
            custoProducao: custoTotal
        };

        try {
            await db.collection("vendas_trojan").add(vendaData);
            this.showToast("Venda salva!");
            this.clearCart();
            if (this.state.isAdmin) this.loadDashboard();
        } catch (e) {
            console.error(e);
            this.showToast("Erro ao salvar no banco", "error");
        }

        // --- LAYOUT DO DISCORD ---
        const itensFormatados = vendaData.itens.map(i => `• ${i.name} — ${i.qtd}x — R$ ${i.total.toLocaleString('pt-BR')}`).join('\n');

        const embedVenda = {
            username: "IceHelper",
            embeds: [{
                title: "📄 Venda Registrada",
                color: 5644438,
                fields: [
                    { name: "💼 Vendedor", value: vendaData.vendedor, inline: true },
                    { name: "🏛️ Facção Compradora", value: vendaData.faccao, inline: true },
                    { name: "📦 Itens", value: itensFormatados, inline: false },
                    { name: "💸 Total Venda", value: `R$ ${vendaData.total.toLocaleString('pt-BR')}`, inline: true },
                    { name: "🔨 Custo Produção", value: `R$ ${vendaData.custoProducao.toLocaleString('pt-BR')}`, inline: true },
                    { name: "💰 Vendedor (40% Lucro)", value: `R$ ${valorVendedor.toLocaleString('pt-BR')}`, inline: true },
                    { name: "🔥 Facção (Liq.)", value: `**R$ ${vendaData.lucroFaccao.toLocaleString('pt-BR')}**`, inline: false }
                ],
                footer: { text: `Data: ${this.formatDate(dataInput)} às ${horaInput}` }
            }]
        };

        // 1. Envio Principal
        this.sendWebhook(CONFIG.WEBHOOKS.VENDAS, embedVenda);
        
        // 2. Envio Log Resumido
        if (CONFIG.WEBHOOKS.LOGS_VENDAS) {
            const itensList = vendaData.itens.map(i => `• ${i.name} (${i.qtd}x)`).join('\n');
            const dataFormatada = this.formatDate(dataInput);
            
            const embedLogVenda = {
                username: "Ice Log",
                embeds: [{
                    color: 5644438,
                    description: `**Comprador:** ${vendaData.faccao}\n**Produtos:**\n${itensList}\n**Data:** ${dataFormatada}\n**Horário:** ${horaInput}`
                }]
            };
            this.sendWebhook(CONFIG.WEBHOOKS.LOGS_VENDAS, embedLogVenda);
        }
    }, 

    async loadDashboard() {
        if (!this.dom['stat-total-vendas']) return;
        this.dom['stats-top-itens'].innerHTML = '<p class="text-muted italic">Carregando...</p>';

        try {
            const dataInicioStr = this.dom['filtro-inicio'].value;
            const dataFimStr = this.dom['filtro-fim'].value;
            const dataInicio = new Date(`${dataInicioStr}T00:00:00`);
            const dataFim = new Date(`${dataFimStr}T23:59:59`);

            const snapshot = await db.collection("vendas_trojan")
                .where("data", ">=", dataInicio)
                .where("data", "<=", dataFim)
                .get();

            let totalVendas = 0, faturamentoFaccao = 0, totalBruto = 0, totalItens = 0, itemCounts = {};

            snapshot.forEach((doc) => {
                const data = doc.data();
                totalVendas++;
                faturamentoFaccao += (data.lucroFaccao || 0);
                totalBruto += (data.total || 0);
                
                if (data.itens) {
                    data.itens.forEach(item => {
                        const itemName = item.name || item.nome; 
                        totalItens += item.qtd;
                        itemCounts[itemName] = (itemCounts[itemName] || 0) + item.qtd;
                    });
                }
            });

            this.dom['stat-total-vendas'].innerText = totalVendas;
            this.dom['stat-faturamento'].innerText = `R$ ${faturamentoFaccao.toLocaleString('pt-BR')}`;
            this.dom['stat-total-itens'].innerText = totalItens;
            if (this.dom['stat-total-bruto']) this.dom['stat-total-bruto'].innerText = `R$ ${totalBruto.toLocaleString('pt-BR')}`;

            const sortedItems = Object.entries(itemCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
            let topHtml = sortedItems.length ? sortedItems.map(([n, q]) => `<div class="top-item"><span>${n}</span><span class="top-item-qtd">${q}</span></div>`).join('') : '<p class="text-muted italic text-center">Nenhuma venda encontrada no período.</p>';
            this.dom['stats-top-itens'].innerHTML = topHtml;
            
        } catch (e) {
            console.error("Erro Dashboard:", e);
            this.dom['stats-top-itens'].innerHTML = '<p class="text-muted italic" style="color:#ef4444;">Erro de permissão no Firebase. Atualize as regras do banco de dados.</p>';
        }
    },

    getTutorialSteps() {
        return [
            { tab: 'vendas', elementId: 'area-vendedor-info', title: "1. Identificação", text: "Comece preenchendo o seu nome e a facção do cliente." },
            { tab: 'vendas', elementId: 'area-tabela-preco', title: "2. Tabela de Preços", text: "Escolha entre preço de <b>Parceria</b> ou <b>Pista</b>. O sistema atualiza os valores automaticamente." },
            { tab: 'vendas', elementId: 'sales-catalog', title: "3. Catálogo", text: "Clique nos itens para selecionar. Defina a quantidade e adicione ao carrinho." },
            { tab: 'vendas', elementId: 'area-carrinho', title: "4. Carrinho & Envio", text: "Revise os itens e clique em <b>Finalizar</b> para enviar o log para o Discord." },
            { tab: 'vendas', elementId: 'area-producao', title: "5. Calculadora de Produção", text: "Descubra exatamente quantos materiais (cobre, alumínio, etc.) você precisa para fabricar o pedido." },
            { tab: 'acoes', elementId: 'acoes', title: "6. Registro de Ações", text: "Registre vitórias ou derrotas em PvP e ações da facção." },
            { tab: 'vendas', elementId: 'btn-admin-secret', title: "7. Modo Admin", text: "Clique em <b>Sistema Online</b> para revelar a aba secreta de <b>Estatísticas</b>." }
        ];
    },

    startTutorial() {
        this.state.tutorialActive = true;
        this.state.tutorialStepIndex = 0;
        this.dom['tutorial-box'].classList.remove('hidden');
        this.renderTutorialStep();
    },

    endTutorial() {
        this.state.tutorialActive = false;
        this.dom['tutorial-box'].classList.add('hidden');
        this.cleanHighlights();
    },

    cleanHighlights() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        document.querySelectorAll('.tutorial-active-parent').forEach(el => el.classList.remove('tutorial-active-parent'));
    },

    prevTutorialStep() {
        if (this.state.tutorialStepIndex > 0) {
            this.cleanHighlights();
            this.state.tutorialStepIndex--;
            this.renderTutorialStep();
        }
    },

    nextTutorialStep() {
        const s = this.getTutorialSteps();
        this.cleanHighlights();
        this.state.tutorialStepIndex++;
        if (this.state.tutorialStepIndex >= s.length) {
            this.endTutorial();
            this.showToast("Fim!");
        } else {
            this.renderTutorialStep();
        }
    },

    renderTutorialStep() {
        const s = this.getTutorialSteps();
        const step = s[this.state.tutorialStepIndex];

        this.switchTab(step.tab);

        this.dom['tut-title'].innerText = step.title;
        this.dom['tut-text'].innerHTML = step.text;
        this.dom['tut-progress'].innerText = `${this.state.tutorialStepIndex + 1}/${s.length}`;
        this.dom['btn-tut-prev'].disabled = (this.state.tutorialStepIndex === 0);

        setTimeout(() => {
            const el = document.getElementById(step.elementId);
            if (el) {
                el.classList.add('tutorial-highlight');
                const p = el.closest('.card');
                if (p) p.classList.add('tutorial-active-parent');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);
    },

    formatarValorLavagem(input) {
        let valor = input.value.replace(/\D/g, '');
        if (valor) {
            valor = parseInt(valor).toLocaleString('pt-BR');
        }
        input.value = valor;
        this.calcularLavagem();
    },

    calcularLavagem() {
        const valorOriginal = parseInt(document.getElementById('lavagem-valor').value.replace(/\D/g, '')) || 0;
        const taxaLavagem = parseFloat(document.getElementById('lavagem-taxa').value) || 0;
        const taxaMaquina = CONFIG.TAXA_MAQUINA;
        const resultadoBox = document.getElementById('lavagem-resultado');

        if (valorOriginal <= 0 || taxaLavagem <= 0) {
            resultadoBox.classList.add('hidden');
            return;
        }

        const taxaTotalValor = valorOriginal * (taxaLavagem / 100);
        const valorLiquido = valorOriginal - taxaTotalValor;
        const taxaMaquinaValor = valorOriginal * (taxaMaquina / 100);
        const restoTaxa = taxaTotalValor - taxaMaquinaValor;
        const alvejante = Math.ceil(valorOriginal / 10000);

        const lucroFaccao = restoTaxa * 0.50;
        const lucroResponsavel = restoTaxa * 0.50;

        document.getElementById('lav-res-original').textContent = `R$ ${valorOriginal.toLocaleString('pt-BR')}`;
        document.getElementById('lav-res-maquina').textContent = `R$ ${taxaMaquinaValor.toLocaleString('pt-BR')}`;
        document.getElementById('lav-res-taxa').textContent = `${taxaLavagem}%`;
        document.getElementById('lav-res-faccao').textContent = `R$ ${lucroFaccao.toLocaleString('pt-BR')}`;
        document.getElementById('lav-res-responsavel').textContent = `R$ ${lucroResponsavel.toLocaleString('pt-BR')}`;
        document.getElementById('lav-res-liquido').textContent = `R$ ${valorLiquido.toLocaleString('pt-BR')}`;
        if (document.getElementById('lav-res-alvejante')) {
            document.getElementById('lav-res-alvejante').textContent = alvejante;
        }

        resultadoBox.classList.remove('hidden');
    },

    async enviarLavagemWebhook() {
        const responsavel = document.getElementById('lavagem-responsavel').value.trim();
        const faccao = document.getElementById('lavagem-faccao').value.trim();
        const valorOriginal = parseInt(document.getElementById('lavagem-valor').value.replace(/\D/g, '')) || 0;
        const taxaLavagem = parseFloat(document.getElementById('lavagem-taxa').value) || 0;
        const dataInput = document.getElementById('lavagem-data').value;
        const horaInput = document.getElementById('lavagem-hora').value;

        if (!responsavel) return this.showToast("Informe o responsável", "error");
        if (!faccao) return this.showToast("Informe a facção", "error");
        if (valorOriginal <= 0) return this.showToast("Informe o valor a lavar", "error");
        if (taxaLavagem <= 0) return this.showToast("Informe a taxa de lavagem", "error");

        const taxaMaquina = CONFIG.TAXA_MAQUINA;
        const taxaTotalValor = valorOriginal * (taxaLavagem / 100);
        const valorLiquido = valorOriginal - taxaTotalValor;
        const taxaMaquinaValor = valorOriginal * (taxaMaquina / 100);
        const restoTaxa = taxaTotalValor - taxaMaquinaValor;
        const lucroFaccao = restoTaxa * 0.50;
        const lucroResponsavel = restoTaxa * 0.50;
        const alvejante = Math.ceil(valorOriginal / 10000);
        const dataFormatada = this.formatDate(dataInput);

        const embedLavagem = {
            username: "IceHelper",
            embeds: [{
                title: "💸 Lavagem de Dinheiro",
                color: 3066993,
                fields: [
                    { name: "👤 Responsável", value: responsavel, inline: true },
                    { name: "🏛️ Facção", value: faccao, inline: true },
                    { name: "💰 Valor Sujo", value: `R$ ${valorOriginal.toLocaleString('pt-BR')}`, inline: true },
                    { name: "📈 Taxa Lavagem", value: `${taxaLavagem}%`, inline: true },
                    { name: "⚙️ Taxa Máquina (10%)", value: `R$ ${taxaMaquinaValor.toLocaleString('pt-BR')}`, inline: true },
                    { name: "🧪 Alvejante", value: `${alvejante} unidades`, inline: true },
                    { name: "🔥 Lucro Facção (50%)", value: `R$ ${lucroFaccao.toLocaleString('pt-BR')}`, inline: true },
                    { name: "👤 Lucro Responsável (50%)", value: `R$ ${lucroResponsavel.toLocaleString('pt-BR')}`, inline: true },
                    { name: "✨ Valor Lavado (Repassar)", value: `R$ ${valorLiquido.toLocaleString('pt-BR')}`, inline: false }
                ],
                footer: { text: `Data: ${dataFormatada} às ${horaInput}` }
            }]
        };

        this.sendWebhook(CONFIG.WEBHOOKS.LAVAGEM, embedLavagem, "Lavagem registrada!");
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
