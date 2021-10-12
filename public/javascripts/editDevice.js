$(() => {
  $('#delete-button').attr('href', window.location.href.replace('edit-device', 'delete-device'));
  const theForm = $('#device-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#initials').removeClass('is-invalid');
    if ($('#initials').val().match(/^[A-Z]{2}$/)) {
      $.post(window.location.href, theForm.serialize(), (response) => {
        switch (response) {
          case 'Edit Successful':
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
