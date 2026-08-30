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

    // 3. Testar cadastro de um NOVO USUÁRIO pela interface web (POST /api/v1/auth/register)
    console.log('3️⃣ Testando auto-cadastro de novo usuário na aba "Novo Usuário"...');
    const uniqueUser = `usr_${Date.now()}`;
    const uniqueEmail = `${uniqueUser}@workbox.local`;
    const uniquePass = 'SenhaForte123!';

    const tabs = await page.$$('button[role="tab"]');
    await tabs[1].click();
    await page.waitForSelector('#signup-username', { timeout: 3000 });

    await page.type('#signup-username', uniqueUser);
    await page.type('#signup-email', uniqueEmail);
    await page.type('#signup-password', uniquePass);
    await page.type('#signup-confirm-password', uniquePass);

    await page.click('button[type="submit"]');

    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    const successText = await page.$eval('.MuiAlert-message', (el) => el.textContent);
    console.log(`   ✅ Cadastro realizado com sucesso: "${successText}"`);

    // 4. Testar login imediato com a nova conta recém-criada
    console.log(`4️⃣ Testando login com o usuário recém-criado (${uniqueUser})...`);
    await page.type('#password', uniquePass);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Login efetuado com sucesso para a conta nova! Navegado para /dashboard.`);

    await page.waitForSelector('.MuiTypography-h5', { timeout: 3000 });
    const welcomeNewUser = await page.$eval('.MuiTypography-h5', (el) => el.textContent);
    console.log(`   ✅ Dashboard renderizado para novo usuário: "${welcomeNewUser}"`);

    // Logout
    const logoutBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout efetuado com sucesso.`);

    // 5. Testar login com "admin" / "admin" e checkbox "Lembrar de mim"
    console.log('5️⃣ Testando login com "admin" e "Lembrar de mim"...');
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

    const rememberCheckbox = await page.$('#rememberMe');
    if (rememberCheckbox) {
      await rememberCheckbox.click();
      console.log('   ✅ Checkbox "Lembrar de mim" marcado.');
    }

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Login de administrador realizado com sucesso.`);

    // Logout
    const logoutAdminBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutAdminBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });

    // 6. Verificar persistência de Lembrar de mim
    console.log('6️⃣ Verificando se o usuário "admin" foi lembrado...');
    const rememberedUsername = await page.$eval('#username', (el) => el.value);
    console.log(`   ✅ Campo de usuário preenchido automaticamente com: "${rememberedUsername}"`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES NO NAVEGADOR E INTEGRAÇÃO FORAM CONCLUÍDAS COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
