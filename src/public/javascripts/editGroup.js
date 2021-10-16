$(() => {
  $('#invite-form').on('submit', (event) => {
    event.preventDefault();
    // eslint-disable-next-line no-undef
    $.post(`/group/${groupId}/invite`, $('#invite-form').serialize(), () => {
      window.location.reload(true);
    });
  });
});
