<script>
    export let name;
</script>

<div class="card {name}">
    <slot></slot>
</div>

<style>
    .card {
        background-color: #202225;
        border-radius: 10px;
        padding: 20px;
    }
    @media (min-width: 600px) {
        .card.first {
            grid-column: 4 / 8;
        }
        .card.second {
            grid-column: 8 / 12;
        }
        .card.third {
            grid-column: 1 / 6;
            grid-row: 2 / 3;
        }
        .card.top-users {
            grid-column: 1 / 6;
        }
        .card.top-channels {
            grid-column: 6 / 12;
        }
        .card.hours {
            grid-column: 6 / 12;
            grid-row: 2 / 3;
        }
        .card.profile {
            grid-column: 1 / 4;
        }
        .card.top-games {
            grid-column: 1 / 6;
        }
        .card.top-voice {
            grid-column: 6 / 12;
            /* height: calc(child-height * 2); */
            max-height: fit-content;
        }
        .card.about {
            grid-column: 1 / 6;
        }
    }
</style>
