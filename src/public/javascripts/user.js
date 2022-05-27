$(() => {
  const resetPasswordForm = $('#reset-password-form');

  resetPasswordForm.on('submit', (event) => {
    event.preventDefault();
    $('#password2').removeClass('is-invalid');
    if ($('#password').val() === $('#password2').val()) {
      $.post('/user/reset-password', resetPasswordForm.serialize(), (response) => {
        switch (response) {
          case 'Reset Successful':
            window.location.href = `${window.location.origin}/login`;
            break;
          default:
        }
      });
    } else {
      $('#password2').addClass('is-invalid');
    }
  });
});
