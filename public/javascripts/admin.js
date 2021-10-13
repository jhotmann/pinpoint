$(() => {
  $('#registration-url').val('');
  $('#generate-registration').on('submit', (event) => {
    event.preventDefault();
    $('#username').removeClass('is-valid');
    $.get('/admin/generate-registration', (registrationId) => {
      const registrationUrl = `${window.location.origin}/register/${registrationId}`;
      $('#registration-table>tbody').prepend(`<tr><th scope="row">${registrationUrl}</th><td><a class="btn btn-primary" href="/admin/revoke-registration/${registrationId}" role="button">Revoke</a></td></tr>`);
      $('#registration-url').val(registrationUrl);
      navigator.clipboard.writeText(registrationUrl);
      $('#username').addClass('is-valid');
    });
  });

  $('#delete-modal').on('show.bs.modal', (event) => {
    const userId = event.relatedTarget.getAttribute('data-bs-userId');
    $('#delete-modal-button').attr('href', `/admin/delete-user/${userId}`);
  });
});
