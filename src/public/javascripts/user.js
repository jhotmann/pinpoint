$(() => {
  const friendSaveButton = $('#friend-save');
  $('#friend-form').on('submit', (event) => {
    event.preventDefault();
    $.post('/user/update-friends', $('#friend-form').serialize(), (result) => {
      if (result === 'Edit Successful') {
        friendSaveButton.addClass('btn-success').removeClass('btn-primary').text('Saved!');
        setTimeout(() => {
          friendSaveButton.removeClass('btn-success').addClass('btn-primary').text('Save Friends');
        }, 2000);
      }
    });
  });

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
