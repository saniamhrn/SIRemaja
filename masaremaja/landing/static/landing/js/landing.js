document.addEventListener('DOMContentLoaded', () => {
    const tickerRows = document.querySelectorAll('.ticker-row');

    tickerRows.forEach(row => {
        row.addEventListener('mouseover', () => {
            row.style.animationPlayState = 'paused';
        });
        row.addEventListener('mouseout', () => {
            row.style.animationPlayState = 'running';
        });
    });
});
