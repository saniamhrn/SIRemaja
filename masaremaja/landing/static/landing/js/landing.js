// document.addEventListener('DOMContentLoaded', () => {
//     // First Row: Moves Right
//     new Swiper('.row-right', {
//         loop: true,
//         speed: 5000, // Adjust speed as needed
//         autoplay: {
//             delay: 0,
//             disableOnInteraction: false,
//         },
//         slidesPerView: 'auto',
//         freeMode: true,
//     });

//     // Second Row: Moves Left
//     new Swiper('.row-left', {
//         loop: true,
//         speed: 5000, // Adjust speed as needed
//         autoplay: {
//             delay: 0,
//             disableOnInteraction: false,
//             reverseDirection: true,
//         },
//         slidesPerView: 'auto',
//         freeMode: true,
//     });
// });

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
