$(() => {
  const theForm = $('#device-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#initials').removeClass('is-invalid');
    $.post('/user/add-device', theForm.serialize(), (response) => {
      switch (response) {
        case 'Add Successful':
          window.location.href = `${window.location.origin}/user`;
          break;
        case 'Initials Invalid':
          $('#initials').addClass('is-invalid');
          break;
        default:
      }
    });
  });
});
