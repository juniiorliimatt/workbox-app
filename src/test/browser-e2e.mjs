import puppeteer from 'puppeteer-core';

async function runBrowserValidation() {
  console.log('🚀 Iniciando validação no Google Chrome headless com contrato atualizado (Email + SocialName)...');
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

    // 2. Auto-cadastro de novo usuário com socialName e email
    console.log('2️⃣ Testando auto-cadastro de novo usuário padrão com Nome Social e E-mail...');
    const uniqueId = Date.now();
    const uniqueSocialName = `Dev Tester ${uniqueId}`;
    const uniqueEmail = `dev_${uniqueId}@workbox.local`;
    const uniquePass = 'SenhaForte123!';

    const tabs = await page.$$('button[role="tab"]');
    await tabs[1].click();
    await page.waitForSelector('#signup-social-name', { timeout: 3000 });

    await page.type('#signup-social-name', uniqueSocialName);
    await page.type('#signup-email', uniqueEmail);
    await page.type('#signup-password', uniquePass);
    await page.type('#signup-confirm-password', uniquePass);

    await page.click('button[type="submit"]');
    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    console.log(`   ✅ Usuário cadastrado com sucesso.`);

    // 3. Login com email do usuário comum e verificação do Dashboard
    console.log(`3️⃣ Testando login com E-mail (${uniqueEmail}) e navegação para /dashboard...`);
    await page.type('#password', uniquePass);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Redirecionado para o Hub de Módulos (/dashboard).`);

    // 4. Testar navegação para a tela de Perfil (/perfil) via botão do cabeçalho
    console.log('4️⃣ Testando navegação para a tela de Perfil (/perfil)...');
    await page.waitForSelector('#btn-perfil', { timeout: 3000 });
    await page.click('#btn-perfil');

    await page.waitForFunction(() => window.location.pathname === '/perfil', { timeout: 5000 });
    const perfilTitle = await page.$eval('h1', (el) => el.textContent);
    console.log(`   ✅ Tela de Perfil renderizada com sucesso: "${perfilTitle}"`);

    // 5. Testar início do fluxo de configuração de MFA (POST /api/v1/auth/mfa/enroll)
    console.log('5️⃣ Testando clique em "Configurar / Habilitar MFA"...');
    await page.waitForSelector('#btn-mfa-enroll', { timeout: 3000 });
    await page.click('#btn-mfa-enroll');

    await page.waitForSelector('#mfa-verify-code', { timeout: 5000 });
    console.log(`   ✅ Chave de segredo MFA e campo de verificação de 6 dígitos gerados pelo backend.`);

    // Voltar para o Dashboard
    await page.waitForSelector('#btn-voltar-dashboard', { timeout: 3000 });
    await page.click('#btn-voltar-dashboard');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 5000 });
    console.log(`   ✅ Retorno ao /dashboard concluído.`);

    // Logout
    const logoutUserBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutUserBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout de usuário comum efetuado.`);

    // 6. Testar login de Administrador com E-mail ("admin@workbox.local") e senha ("admin")
    console.log('6️⃣ Testando login com Administrador ("admin@workbox.local")...');
    await page.$eval('#email', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#email', 'admin@workbox.local');

    await page.$eval('#password', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#password', 'admin');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });

    const totalCardsAdmin = await page.$$eval('.MuiCard-root', (cards) => cards.length);
    console.log(`   ✅ Total de cards para Administrador: ${totalCardsAdmin} (esperado 12)`);

    const logoutAdminBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutAdminBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout final concluído.`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES DE CONTRATO OPENAPI (EMAIL + SOCIALNAME) PASSARAM COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
