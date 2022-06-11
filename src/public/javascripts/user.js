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

  document.body.addEventListener('invalidInitials', () => {
    $('#initials-feedback').text('Initials taken');
    $('#initials').addClass('is-invalid');
  });

  const addEditModal = new bootstrap.Modal(document.getElementById('add-edit-device-modal'));
  document.body.addEventListener('deviceSave', () => {
    console.log('device saved');
    addEditModal.hide();
  });
});
