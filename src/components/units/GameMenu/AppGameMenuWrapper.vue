<template>
  <div id="app-game-container">
    <AppGameMenuCV/>
    <div class="game-instance">
      <AppGameVvhCV/>
    </div>
    <div class="game-instance">
      <AppGameVvh/>
    </div>
  </div>
</template>


<script lang="ts" setup>
import { ref, reactive } from 'vue';
import AppGameVvh from "../VVH/AppGameVvh.vue";
import AppGameVvhCV from "../VVH/AppGameVvhCV.vue";
import AppGameMenuCV from "./AppGameMenuCV.vue";
</script>

<style scoped>
#app-game-container {
  display: flex;
  flex-direction: column;
  gap: 2rem; /* Space between the two instances */
}

.game-instance {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.button-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background-color: #45a049;
}
</style>