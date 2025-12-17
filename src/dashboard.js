import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Exportar dados do dashboard para Excel
document.getElementById('btn-export-excel').addEventListener('click', async function() {
    const filterValue = document.getElementById('period-filter').value;
    let dataInicio = null, dataFim = null;
    if (filterValue === 'personalizado') {
        dataInicio = document.getElementById('data-inicio-grafico').value;
        dataFim = document.getElementById('data-fim-grafico').value;
    }
    const fechamentos = await fetchFechamentos(filterValue, dataInicio, dataFim);
    if (!fechamentos.length) {
        alert('Nenhum dado para exportar!');
        return;
    }
    const ws = XLSX.utils.json_to_sheet(fechamentos.map(f => ({
        Data: f.data,
        'Total Dinheiro': f.total_money,
        'Débito': f.debito,
        'Crédito': f.credito,
        'Pix': f.pix,
        'Total Cartões': f.total_card,
        'Total Geral': f.total_general
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fechamentos');
    XLSX.writeFile(wb, 'fechamentos.xlsx');
});

// Exportar dados do dashboard para PDF
document.getElementById('btn-export-pdf').addEventListener('click', async function() {
    const filterValue = document.getElementById('period-filter').value;
    let dataInicio = null, dataFim = null;
    if (filterValue === 'personalizado') {
        dataInicio = document.getElementById('data-inicio-grafico').value;
        dataFim = document.getElementById('data-fim-grafico').value;
    }
    const fechamentos = await fetchFechamentos(filterValue, dataInicio, dataFim);
    if (!fechamentos.length) {
        alert('Nenhum dado para exportar!');
        return;
    }
    const doc = new jsPDF();
    doc.text('Relatório de Fechamentos de Caixa', 14, 16);
    autoTable(doc, {
        head: [[
            'Data', 'Total Dinheiro', 'Débito', 'Crédito', 'Pix', 'Total Cartões', 'Total Geral'
        ]],
        body: fechamentos.map(f => [
            f.data,
            f.total_money,
            f.debito,
            f.credito,
            f.pix,
            f.total_card,
            f.total_general
        ]),
        startY: 22
    });
    doc.save('fechamentos.pdf');
});

import { supabase } from './supabaseClient.js';

// Checagem de sessão: só permite acesso se estiver logado
(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/';
    }
})();
// --- LÓGICA DO DASHBOARD ---
// Função para obter os valores do fechamento
function getFechamentoData() {
    // Moedas e cédulas
    let totalMoney = 0;
    moneyInputs.forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const value = parseFloat(input.dataset.value);
        totalMoney += qty * value;
    });
    // Cartões e Pix
    let debito = parseFloat(document.getElementById('debito-input')?.value) || 0;
    let credito = parseFloat(document.getElementById('credito-input')?.value) || 0;
    let pix = parseFloat(document.getElementById('pix-input')?.value) || 0;
    let totalCard = debito + credito + pix;
    let totalGeneral = totalMoney + totalCard;
    return {
        total_money: totalMoney,
        debito,
        credito,
        pix,
        total_card: totalCard,
        total_general: totalGeneral
    };
}

// Função para fechar o caixa
async function fecharCaixa() {
    const dataFechamento = document.getElementById('data-fechamento').value;
    if (!dataFechamento) {
        alert('Selecione a data do fechamento!');
        return;
    }
    const valores = getFechamentoData();
    const { error } = await supabase.from('fechamentos').insert([
        {
            data: dataFechamento,
            ...valores
        }
    ]);
    if (!error) {
        document.getElementById('modal-sucesso').classList.remove('hidden');
    } else {
        alert('Erro ao salvar fechamento: ' + error.message);
    }
}

// Adiciona evento ao botão de fechar caixa
document.getElementById('btn-fechar-caixa').addEventListener('click', fecharCaixa);

// 1. Configuração Inicial (Data e Formatador)
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('pt-BR', options);

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 2. Lógica da Calculadora de Caixa
const moneyInputs = document.querySelectorAll('.calc-input');
const valInputs = document.querySelectorAll('.val-input');

function calculateTotals() {
    let totalMoney = 0;
    let totalCard = 0;

    // Calcula moedas e notas
    moneyInputs.forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const value = parseFloat(input.dataset.value);
        const subtotal = qty * value;
        input.nextElementSibling.innerText = formatCurrency(subtotal);
        totalMoney += subtotal;
    });

    // Calcula cartões
    valInputs.forEach(input => {
        totalCard += parseFloat(input.value) || 0;
    });

    // Atualiza o resumo lateral
    document.getElementById('total-money').innerText = formatCurrency(totalMoney);
    document.getElementById('total-card').innerText = formatCurrency(totalCard);
    document.getElementById('total-general').innerText = formatCurrency(totalMoney + totalCard);
}

// Adiciona os eventos de digitação
moneyInputs.forEach(input => input.addEventListener('input', calculateTotals));
valInputs.forEach(input => input.addEventListener('input', calculateTotals));



// Função para buscar fechamentos do Supabase
async function fetchFechamentos(periodo, dataInicio = null, dataFim = null) {
    let fromDate = new Date();
    let toDate = new Date();
    if (periodo === 'semana') {
        fromDate.setDate(fromDate.getDate() - 6);
    } else if (periodo === 'mes') {
        fromDate.setDate(1);
    } else if (periodo === 'ano') {
        fromDate = new Date(fromDate.getFullYear(), 0, 1);
    } else if (periodo === 'personalizado' && dataInicio && dataFim) {
        fromDate = new Date(dataInicio);
        toDate = new Date(dataFim);
    }
    const fromStr = (periodo === 'personalizado' && dataInicio) ? dataInicio : fromDate.toISOString().split('T')[0];
    const toStr = (periodo === 'personalizado' && dataFim) ? dataFim : toDate.toISOString().split('T')[0];
    let query = supabase
        .from('fechamentos')
        .select('*')
        .gte('data', fromStr)
        .lte('data', toStr)
        .order('data', { ascending: true });
    const { data, error } = await query;
    if (error) return [];
    return data;
}

let salesChart, paymentChart;

// 4. Funções Globais (acessíveis pelo HTML)

// Inicializa os Gráficos
function initCharts() {
    const ctxSales = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(ctxSales, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Vendas (R$)',
                data: [],
                backgroundColor: '#2563eb',
                borderRadius: 5,
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const ctxPayment = document.getElementById('paymentChart').getContext('2d');
    paymentChart = new Chart(ctxPayment, {
        type: 'doughnut',
        data: {
            labels: ['Dinheiro', 'Débito', 'Crédito', 'Pix'],
            datasets: [{
                data: [],
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#6366f1'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Carrega dados iniciais
    window.updateDashboard();
}


// Atualiza o Dashboard ao clicar no botão
window.updateDashboard = async function() {
    const filterValue = document.getElementById('period-filter').value;
    let dataInicio = null, dataFim = null;
    if (filterValue === 'personalizado') {
        dataInicio = document.getElementById('data-inicio-grafico').value;
        dataFim = document.getElementById('data-fim-grafico').value;
        if (!dataInicio || !dataFim) {
            alert('Selecione o período desejado!');
            return;
        }
    }
    const fechamentos = await fetchFechamentos(filterValue, dataInicio, dataFim);
    if (!fechamentos.length) {
        document.getElementById('card-revenue').innerText = 'R$ 0,00';
        document.getElementById('card-growth').innerHTML = '';
        document.getElementById('card-ticket').innerText = 'R$ 0,00';
        document.getElementById('card-split').innerText = '0% / 0%';
        salesChart.data.labels = [];
        salesChart.data.datasets[0].data = [];
        salesChart.update();
        paymentChart.data.datasets[0].data = [0,0,0,0];
        paymentChart.update();
        return;
    }
    // Faturamento total
    const total = fechamentos.reduce((acc, f) => acc + (f.total_general || 0), 0);
    document.getElementById('card-revenue').innerText = formatCurrency(total);
    // Crescimento (simples: compara último com penúltimo)
    let growth = '';
    let growthColor = 'text-green-500';
    if (fechamentos.length > 1) {
        const ult = fechamentos[fechamentos.length-1].total_general || 0;
        const penult = fechamentos[fechamentos.length-2].total_general || 0;
        const perc = penult ? ((ult-penult)/penult*100).toFixed(1) : 0;
        growth = `${perc > 0 ? '+' : ''}${perc}% vs anterior`;
        growthColor = perc < 0 ? 'text-red-500' : 'text-green-500';
    }
    document.getElementById('card-growth').innerHTML = growth ? `<i class=\"fas fa-arrow-${growthColor.includes('red') ? 'down' : 'up'}\"></i> ${growth}` : '';
    document.getElementById('card-growth').className = `text-sm font-bold ${growthColor}`;
    // Ticket médio
    const ticket = total / fechamentos.length;
    document.getElementById('card-ticket').innerText = formatCurrency(ticket);
    // Split dinheiro/cartão
    const totalMoney = fechamentos.reduce((acc, f) => acc + (f.total_money || 0), 0);
    const totalCard = fechamentos.reduce((acc, f) => acc + (f.total_card || 0), 0);
    const splitDin = total ? Math.round(totalMoney/total*100) : 0;
    const splitCard = total ? Math.round(totalCard/total*100) : 0;
    document.getElementById('card-split').innerText = `${splitDin}% / ${splitCard}%`;
    // Gráfico de vendas (por data)
    salesChart.data.labels = fechamentos.map(f => new Date(f.data).toLocaleDateString('pt-BR'));
    salesChart.data.datasets[0].data = fechamentos.map(f => f.total_general || 0);
    salesChart.update();
    // Gráfico de métodos de pagamento (soma de todos)
    const debito = fechamentos.reduce((acc, f) => acc + (f.debito || 0), 0);
    const credito = fechamentos.reduce((acc, f) => acc + (f.credito || 0), 0);
    const pix = fechamentos.reduce((acc, f) => acc + (f.pix || 0), 0);
    paymentChart.data.datasets[0].data = [totalMoney, debito, credito, pix];
    paymentChart.update();
}
// Exibir campos de data quando filtro personalizado for selecionado
document.getElementById('period-filter').addEventListener('change', function() {
    const filtroDatas = document.getElementById('filtro-datas-personalizado');
    if (this.value === 'personalizado') {
        filtroDatas.classList.remove('hidden');
    } else {
        filtroDatas.classList.add('hidden');
    }
});

// Troca de Abas
window.switchTab = function(tabName) {
    document.getElementById('view-input').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    
    document.getElementById('tab-input').className = "pb-2 px-2 text-slate-500 hover:text-blue-500 transition";
    document.getElementById('tab-dashboard').className = "pb-2 px-2 text-slate-500 hover:text-blue-500 transition";

    document.getElementById('view-' + tabName).classList.remove('hidden');
    const activeBtn = document.getElementById('tab-' + tabName);
    activeBtn.className = "active-tab pb-2 px-2 hover:text-blue-500 transition";
    
    // Inicia gráficos na primeira vez que abre a aba
    if(tabName === 'dashboard' && !salesChart) {
        initCharts();
    }
}