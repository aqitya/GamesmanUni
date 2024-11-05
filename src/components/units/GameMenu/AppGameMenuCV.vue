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

const s3BucketUrl = 'https://aarteebucket.s3.us-east-1.amazonaws.com/';
const lambda_url = 'https://gxk2mdx64p4whp2oup42jicj3e0cbomu.lambda-url.us-east-1.on.aws/';

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
const MOVE_MAPPING = {
  'M_42_49_x': '1',
  'M_43_50_x': '2',
  'M_44_51_x': '3',
  'M_45_52_x': '4',
  'M_46_53_x': '5',
  'M_47_54_x': '6',
  'M_48_55_x': '7'
};

const invokeFunctionUrlAndRunMoves = async () => {
  if (!selectedFile.value) {
    uploadErrorMessage.value = "No file selected for analysis.";
    return;
  }

  isAnalyzing.value = true;

  try {
    const payload = {
      Records: [
        {
          s3: {
            bucket: {
              name: "aarteebucket",
            },
            object: {
              key: selectedFile.value.name,
            }
          }
        }
      ]
    };

    const response = await axios.post(lambda_url, payload);
    console.log('Lambda response:', response);

    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    const result = response.data;
    
    if (result && result.moves) {
      const moves = result.moves.split('\n');

      for (const move of moves) {
        const trimmedMove = move.trim();
        if (trimmedMove) {
          // Wait for store to be ready          
          // Use the computed appInstance instead of direct app access
          const currentPosition = appInstance.value?.currentMatch?.round?.position;
          
          if (!currentPosition) {
            console.error('Current position not available');
            continue;
          }

          // Find the move number by looking at the availableMoves object
          const moveEntry = Object.entries(currentPosition.availableMoves)
            .find(([_, value]) => value.autoguiMove === trimmedMove);

          if (moveEntry) {
            const [moveNumber, moveObject] = moveEntry;
            
            // Create payload matching the store's expected structure
            const movePayload = {
              move: moveNumber // Changed from autoguiMove to move
            };
            
            console.log('Processing move:', {
              original: trimmedMove,
              moveNumber,
              moveObject,
              payload: movePayload
            });
            
            try {              
              // Dispatch with correct payload structure
              await store.dispatch('runMove', movePayload);
              
              // Verify the move was processed
              console.log('Move processed. Current position:', appInstance.value?.currentMatch?.round?.position);
            } catch (moveError) {
              console.error('Error executing move:', moveError);
              console.error('Move payload:', movePayload);
              throw moveError;
            }
          } else {
            console.warn('Move not found in available moves:', trimmedMove);
            console.log('Available moves:', currentPosition.availableMoves);
          }
        }
      }
    } else {
      console.error('Unexpected response format:', result);
    }

  } catch (error) {
    console.error('Error in move processing:', error);
    uploadErrorMessage.value = "Failed to process moves. Please try again later.";
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
