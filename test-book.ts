async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "eduardoferreiramartins74@gmail.com", displayName: "Eduardo" })
  });
  const data = await loginRes.json();
  const token = data.token;
  
  if (!token) {
    console.error("Login failed", data);
    return;
  }
  
  const testRes = await fetch('http://localhost:3000/api/test-book-sync', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(testRes.status, await testRes.text());
}
run();
