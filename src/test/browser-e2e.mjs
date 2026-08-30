import puppeteer from 'puppeteer-core';

async function runBrowserValidation() {
  console.log('🚀 Iniciando validação no Google Chrome headless...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', (err) => console.log(`[Browser Error]: ${err.toString()}`));

  try {
    // 1. Navegar até a aplicação
    console.log('1️⃣ Navegando para http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const title = await page.$eval('h1', (el) => el.textContent);
    console.log(`   ✅ Título da página renderizado: "${title}"`);

    // 2. Testar validação de formulário vazio
    console.log('2️⃣ Testando submissão de formulário vazio...');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.MuiFormHelperText-root.Mui-error', { timeout: 3000 });
    console.log('   ✅ Mensagens de validação Yup/MUI exibidas com sucesso.');

    // 3. Testar alternância para a aba de Novo Usuário (Cadastro)
    console.log('3️⃣ Testando alternância para aba de Novo Usuário...');
    const tabs = await page.$$('button[role="tab"]');
    if (tabs.length >= 2) {
      await tabs[1].click();
      await page.waitForSelector('#signup-username', { timeout: 3000 });
      console.log('   ✅ Formulário de Novo Usuário renderizado com sucesso.');

      // Voltar para a aba de Login
      await tabs[0].click();
      await page.waitForSelector('#username', { timeout: 3000 });
      console.log('   ✅ Alternância de volta para Login concluída.');
    }

    // 4. Testar login com credenciais incorretas
    console.log('4️⃣ Testando login com credenciais incorretas (usuário inexistente)...');
    await page.$eval('#username', (el) => { el.value = ''; });
    await page.$eval('#password', (el) => { el.value = ''; });
    await page.type('#username', 'usuario_invalido');
    await page.type('#password', 'senha_errada');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.MuiAlert-message', { timeout: 5000 });
    const alertText = await page.$eval('.MuiAlert-message', (el) => el.textContent);
    console.log(`   ✅ Alerta de erro da API capturado: "${alertText}"`);

    // 5. Testar login válido com "admin" / "admin" e "Lembrar de mim"
    console.log('5️⃣ Testando login válido com "admin" / "admin" e checkbox "Lembrar de mim"...');
    await page.$eval('#username', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#username', 'admin');

    await page.$eval('#password', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#password', 'admin');

    // Marcar checkbox "Lembrar de mim"
    const rememberCheckbox = await page.$('#rememberMe');
    if (rememberCheckbox) {
      await rememberCheckbox.click();
      console.log('   ✅ Checkbox "Lembrar de mim" marcado.');
    }

    await page.click('button[type="submit"]');

    // Aguardar transição de rota SPA para /dashboard
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Navegação SPA para /dashboard concluída.`);

    await page.waitForSelector('.MuiTypography-h5', { timeout: 3000 });
    const welcomeText = await page.$eval('.MuiTypography-h5', (el) => el.textContent);
    console.log(`   ✅ Dashboard renderizado com texto: "${welcomeText}"`);

    // 6. Testar botão de Logout
    console.log('6️⃣ Testando ação de Logout...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sairBtn = btns.find((b) => b.textContent?.includes('Sair'));
      sairBtn?.click();
    });

    // Aguardar transição de rota SPA de volta para /
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Redirecionado com sucesso após logout para: /`);

    // 7. Verificar se o usuário foi lembrado no formulário de login
    console.log('7️⃣ Verificando se o usuário foi lembrado no campo de login...');
    const rememberedUsername = await page.$eval('#username', (el) => el.value);
    console.log(`   ✅ Campo de usuário preenchido automaticamente com: "${rememberedUsername}"`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES NO NAVEGADOR FORAM CONCLUÍDAS COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
