$(() => {
  const theForm = $('#registration-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#password2').removeClass('is-invalid');
    if ($('#password').val() === $('#password2').val()) {
      $.post(window.location.pathname, theForm.serialize(), (response) => {
        switch (response) {
          case 'Register Successful':
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
