$(() => {
  const theForm = $('#login-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#username').removeClass('is-invalid');
    $('#password').removeClass('is-invalid');
    $.post('/login', theForm.serialize(), (response) => {
      switch (response) {
        case 'Login Successful':
          window.location.href = `${window.location.origin}/user`;
          break;
        case 'Invalid Password':
          $('#password').addClass('is-invalid');
          break;
        case 'Invalid Username':
          $('#username').addClass('is-invalid');
          break;
        default:
      }
    });
  });
});
