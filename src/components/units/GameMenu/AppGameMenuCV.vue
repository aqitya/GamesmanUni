<template>
  <div>
    <div class="video-import-container">
      <label for="video-upload" class="video-upload-label">Choose Video File:</label>
      <input
        type="file"
        id="video-upload"
        accept="video/*"
        @change="handleFileChange"
      />
    </div>

    <div v-if="isUploading" class="progress-bar">
      <div class="progress" :style="{ width: uploadProgress + '%' }"></div>
    </div>

    <button class="upload-button" @click="uploadVideo" :disabled="isUploading || !selectedFile">
      Upload Video
    </button>

    <div v-if="isAnalyzing" class="wait-timer">
      <p>Analyzing the video, please wait...</p>
      <div class="spinner"></div>
    </div>

    <button
      class="function-url-button"
      @click="invokeFunctionUrlAndRunMoves"
      :disabled="!uploadSuccessMessage || isAnalyzing"
    >
      Run Moves from Function URL
    </button>

    <p v-if="uploadSuccessMessage">{{ uploadSuccessMessage }}</p>
    <p v-if="uploadErrorMessage" class="error">{{ uploadErrorMessage }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import axios from 'axios';
import { useStore } from '../../../scripts/plugins/store/index';

const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const isAnalyzing = ref(false);
const uploadProgress = ref(0);
const uploadSuccessMessage = ref<string | null>(null);
const uploadErrorMessage = ref<string | null>(null);

const s3BucketUrl = '';

const store = useStore();
const appInstance = computed(() => store.getters.appInstance);

const handleFileChange = (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    uploadSuccessMessage.value = null;
    uploadErrorMessage.value = null;
  }
};

const uploadVideo = async () => {
  if (!selectedFile.value) {
    uploadErrorMessage.value = "Please select a file before uploading.";
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  const file = selectedFile.value;
  const fileKey = file.name;
  const uploadUrl = `${s3BucketUrl}${fileKey}`;

  try {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        }
      },
    });
    uploadSuccessMessage.value = "File uploaded successfully!";
  } catch (error) {
    console.error('Error uploading file:', error);
    uploadErrorMessage.value = "Error uploading file. Please try again.";
  } finally {
    isUploading.value = false;
  }
};

const invokeFunctionUrlAndRunMoves = async () => {
  if (!selectedFile.value) {
    uploadErrorMessage.value = "No file selected for analysis.";
    return;
  }

  isAnalyzing.value = true;

  try {
    const payload = {
      bucket: '',
      key: selectedFile.value.name,
    };

    const response = await axios.post('', payload);

    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    const result = response.data;

    if (typeof result === 'object' && result.moves) {
      const moves = result.moves.split('\n');
      for (const move of moves) {
        if (move.trim()) {
          const movePayload = {
            autoguiMove: "M_45_52_x",
          };

          await store.dispatch('runMove', movePayload);
        }
      }
    } else {
      console.error('Unexpected response format:', result);
    }

  } catch (error) {
    console.error('Error fetching data from function URL:', error);
    uploadErrorMessage.value = "Failed to fetch data or run moves. Please try again later.";
  } finally {
    isAnalyzing.value = false;
  }
};
</script>

<style scoped>
.video-import-container {
  margin: 1rem 0;
}

.upload-button,
.function-url-button {
  margin-top: 1rem;
}

.error {
  color: red;
}

.progress-bar {
  width: 100%;
  background-color: #f3f3f3;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress {
  height: 8px;
  background-color: #4caf50;
}

.wait-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
