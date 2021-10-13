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

  $('#create-group-form').on('submit', (event) => {
    event.preventDefault();
    $('#groupName').removeClass('is-invalid');
    $.post('/user/create-group', $('#create-group-form').serialize(), (result) => {
      if (result === 'Add Successful') {
        window.location.reload(true);
      } else {
        $('#groupName').addClass('is-invalid');
      }
    });
  });
});
