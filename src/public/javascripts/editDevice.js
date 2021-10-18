$(() => {
  $('#delete-button').attr('href', window.location.href.replace('edit-device', 'delete-device'));
  const theForm = $('#device-form');

  theForm.on('submit', (event) => {
    event.preventDefault();
    $('#initials').removeClass('is-invalid');
    $('#device-save').text('Updating');
    $.ajax({
      type: 'POST',
      url: window.location.href,
      processData: false,
      contentType: false,
      data: new FormData(document.getElementById('device-form')),
      success: (response) => {
        $('#device-save').text('Save');
        switch (response) {
          case 'Edit Successful':
            window.location.href = `${window.location.origin}/user`;
            break;
          case 'Initials Invalid':
            $('#initials').addClass('is-invalid');
            break;
          default:
        }
      },
    });
  });
});
