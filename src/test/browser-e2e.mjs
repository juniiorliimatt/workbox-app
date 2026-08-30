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
  page.on('requestfailed', (req) => console.log(`[Request Failed]: ${req.url()} - ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      console.log(`[API Response]: ${res.status()} ${res.url()}`);
    }
  });

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

    // 3. Testar login com credenciais incorretas (usuário inexistente)
    console.log('3️⃣ Testando login com credenciais incorretas (usuário inexistente)...');
    await page.$eval('#username', (el) => { el.value = ''; });
    await page.$eval('#password', (el) => { el.value = ''; });
    await page.type('#username', 'usuario_invalido');
    await page.type('#password', 'senha_errada');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.MuiAlert-message', { timeout: 5000 });
    const alertText = await page.$eval('.MuiAlert-message', (el) => el.textContent);
    console.log(`   ✅ Alerta de erro da API capturado: "${alertText}"`);

    // 4. Testar login com credenciais corretas (admin/admin)
    console.log('4️⃣ Testando login válido com "admin" / "admin"...');
    // Limpar campos de forma confiável com evaluate
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

    await page.click('button[type="submit"]');

    // Aguardar transição de rota SPA para /dashboard
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Navegação SPA para /dashboard concluída.`);

    await page.waitForSelector('.MuiTypography-h5', { timeout: 3000 });
    const welcomeText = await page.$eval('.MuiTypography-h5', (el) => el.textContent);
    console.log(`   ✅ Dashboard renderizado com texto: "${welcomeText}"`);

    // 5. Testar botão de Logout
    console.log('5️⃣ Testando ação de Logout...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sairBtn = btns.find((b) => b.textContent?.includes('Sair'));
      sairBtn?.click();
    });

    // Aguardar transição de rota SPA de volta para /
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Redirecionado com sucesso após logout para: /`);

    // 6. Testar ProtectedRoute (tentar acessar /dashboard deslogado)
    console.log('6️⃣ Testando proteção de rota (acesso direto a /dashboard sem autenticação)...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ ProtectedRoute interceptou e redirecionou com sucesso para: /`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES NO NAVEGADOR FORAM CONCLUÍDAS COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
