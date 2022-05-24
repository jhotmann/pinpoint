function checkPasswordsMatch(input) {
  const password1value = document.getElementById('password').value;
  if (input.value === password1value) {
    input.setCustomValidity('');
    input.classList.remove('is-invalid');
  } else {
    input.setCustomValidity('Passwords don\'t match');
    input.classList.add('is-invalid');
  }
}
