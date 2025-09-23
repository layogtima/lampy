const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        onMounted(() => {
            patterns.forEach((p) => {
                initPattern(p.name.toLowerCase());
            });
        });

        const states = {
            HELLO: 'hello',
            INTRO: 'intro',
            ADD_PATTERN: 'addPattern',
            SHOW_PATTERNS: 'showPatterns'
        };

        const currentState = ref(states.HELLO);
        const greeting = ref("Hi, I'm Lampy!");
        const nextLine = ref("Let's setup my first pattern!");
        const patterns = [
            { name: "Water" },
            { name: "Spirula" },
            { name: "Firefly" },
            { name: "Fire" }
        ];

        const transitionTo = (state, delay = 0) => {
            setTimeout(() => {
                currentState.value = state;
            }, delay);
        };

        const continueClick = (state) => {
            const card = document.querySelector('.card.' + currentState.value);
            card.classList.remove('in');

            // Transition to the next state after fade-out
            setTimeout(() => {
                transitionTo(state);
            }, 2000); // Match this delay with the CSS transition duration
        };

        return {
            greeting,
            nextLine,
            patterns,
            currentState,
            states,
            transitionTo,
            continueClick
        };
    }
}).mount('#app');

