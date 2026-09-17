const { ChromeController } = require('./cdp_helper');

(async () => {
  const c = new ChromeController({ port: 9558 });
  await c.start();
  await c.navigate('http://127.0.0.1:3000/live-studio.html');
  const res = await c.evaluate(`
    (function() {
      const v = window.LDocValidator;
      if (!v) return { error: 'no validator' };
      const b1 = v.sanitizeBlock({ text: '<script>alert("xss")</script><b>Safe</b>' });
      const b2 = v.sanitizeBlock({ url: 'javascript:alert(1)' });
      const b3 = v.sanitizeBlock({ attr: ' onclick="alert(1)"' });
      return {
        t: b1.text,
        u: b2.url,
        a: b3.attr,
        scriptClean: !b1.text.includes('<script>') && b1.text.includes('<b>Safe</b>'),
        jsUrlClean: !b2.url.includes('javascript:'),
        eventClean: !b3.attr.includes('onclick=')
      };
    })()
  `);
  console.log('Sanitization test result:', res);
  await c.close();
})().catch(e => console.error(e));
