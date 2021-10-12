$(() => {
  const theForm = $('#device-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#initials').removeClass('is-invalid');
    if ($('#initials').val().match(/^[A-Z]{2}$/)) {
      $.post('/user/add-device', theForm.serialize(), (response) => {
        switch (response) {
          case 'Add Successful':
            window.location.href = `${window.location.origin}/user`;
            break;
          default:
        }
      });
    } else {
      $('#initials').addClass('is-invalid');
    }
  });
});
