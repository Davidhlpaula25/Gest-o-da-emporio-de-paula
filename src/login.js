import { supabase } from './supabaseClient.js'

const form = document.getElementById('login-form')
const errorMsg = document.getElementById('error-msg')

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    // O .trim() garante que não estamos enviando espaços vazios
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value.trim()

    console.log("Tentando logar com:", email) // Veja no console se o email está certo

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })

    if (error) {
        console.error("Erro Supabase:", error.message)
        errorMsg.textContent = "Erro: Email ou senha incorretos."
        errorMsg.classList.remove('hidden')
    } else {
        console.log("Sucesso!", data)
        window.location.href = '/dashboard.html' // Redireciona
    }
})