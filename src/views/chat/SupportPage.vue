<template>
  <v-container class="pa-4 pa-sm-6 pa-md-8">
    <v-sheet rounded="lg" class="pa-4 pa-sm-8" color="background" elevation="0">
      <h1 class="text-h4 text-primary font-weight-bold mb-6">
        How can we help you?
      </h1>
      <v-row :dense="false" justify="center">
        <v-col cols="12" md="6">
          <v-card
            class="d-flex flex-column text-center fill-height"
            hover
            @click="handleNavigation('/patient/chat/ai')"
          >
            <v-card-item class="pa-6">
              <v-icon icon="mdi-robot-outline" color="primary-lighten-1" size="60" class="mb-4"></v-icon>
              <div class="text-h5 font-weight-medium">Chat with DentiCare AI</div>
            </v-card-item>
            <v-card-text class="text-body-1 text-medium-emphasis">
              Get quick answers to general dental questions.
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card
            class="d-flex flex-column text-center fill-height"
            hover
            @click="handleNavigation('/patient/chat/support')"
          >
            <v-card-item class="pa-6">
              <v-icon icon="mdi-account-headset" color="primary-lighten-1" size="60" class="mb-4"></v-icon>
              <div class="text-h5 font-weight-medium">Chat with a Real Person</div>
            </v-card-item>
            <v-card-text class="text-body-1 text-medium-emphasis">
              Talk directly with a DentiCare employee.
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-sheet>
  </v-container>
</template>

<script setup lang="ts">
const handleNavigation = (path: string) => {
  // In a real app, this would use the router. For example:
  // import { useRouter } from 'vue-router';
  // const router = useRouter();
  // router.push(path);
  console.log(`Navigating to ${path}`);
};
</script>