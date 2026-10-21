package com.nestswap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end check of the main features against the in-memory H2 database.
 * Run with:  mvn test
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = {"app.seed-demo=false", "app.upload-dir=target/test-uploads", "app.alerts.initial-delay-ms=3600000"})
class ApiFlowTest {

    // Smallest valid PNG (1x1 pixel)
    private static final byte[] PNG = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void fullFlow() throws Exception {
        String host = register("host@school.edu", "Host");
        String guest = register("guest@example.com", "Guest");

        // --- create a listing with a photo
        Map<String, Object> form = new java.util.HashMap<>(Map.of(
                "title", "Test 1BR near campus", "description", "A lovely test apartment close to everything.",
                "listingType", "SUBLEASE", "monthlyRent", 800, "bedrooms", 1, "bathrooms", 1,
                "address", "1 Main St", "city", "Ypsilanti", "state", "MI",
                "availableFrom", LocalDate.now().plusDays(10).toString()));
        form.put("latitude", 42.2475);
        form.put("longitude", -83.6262);
        form.put("subletPermissionConfirmed", true);
        form.put("photoOrder", java.util.List.of("n:0"));
        form.put("newImageAltTexts", java.util.List.of("Living room"));

        MvcResult created = mvc.perform(multipart("/api/listings")
                        .file(new MockMultipartFile("data", "", "application/json", json.writeValueAsBytes(form)))
                        .file(new MockMultipartFile("photos", "a.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + host))
                .andExpect(status().isCreated()).andReturn();
        long listingId = body(created).get("id").asLong();

        // --- a non-image upload is rejected
        mvc.perform(multipart("/api/listings")
                        .file(new MockMultipartFile("data", "", "application/json", json.writeValueAsBytes(form)))
                        .file(new MockMultipartFile("photos", "evil.png", "image/png", "<script>".getBytes()))
                        .header("Authorization", "Bearer " + host))
                .andExpect(status().isBadRequest());

        // --- search: budget filter and distance filter (EMU campus, 2 miles)
        JsonNode inBudget = body(mvc.perform(get("/api/listings").param("maxRent", "900")).andReturn());
        assertThat(inBudget.get("totalItems").asInt()).isEqualTo(1);
        JsonNode tooCheap = body(mvc.perform(get("/api/listings").param("maxRent", "500")).andReturn());
        assertThat(tooCheap.get("totalItems").asInt()).isZero();
        JsonNode near = body(mvc.perform(get("/api/listings")
                .param("lat", "42.2506").param("lng", "-83.6240").param("radiusMiles", "2")).andReturn());
        assertThat(near.get("totalItems").asInt()).isEqualTo(1);
        assertThat(near.get("items").get(0).get("distanceMiles").asDouble()).isLessThan(2);
        JsonNode far = body(mvc.perform(get("/api/listings")
                .param("lat", "42.3314").param("lng", "-83.0458").param("radiusMiles", "5")).andReturn()); // Detroit
        assertThat(far.get("totalItems").asInt()).isZero();

        // --- save it, then message the host
        mvc.perform(put("/api/listings/" + listingId + "/save").header("Authorization", "Bearer " + guest))
                .andExpect(status().isNoContent());
        JsonNode savedList = body(mvc.perform(get("/api/saved/listings").header("Authorization", "Bearer " + guest)).andReturn());
        assertThat(savedList.size()).isEqualTo(1);

        JsonNode conv = body(mvc.perform(post("/api/listings/" + listingId + "/conversations")
                        .header("Authorization", "Bearer " + guest)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Is it still available?\"}"))
                .andExpect(status().isCreated()).andReturn());
        long convId = conv.get("summary").get("id").asLong();

        JsonNode unread = body(mvc.perform(get("/api/conversations/unread").header("Authorization", "Bearer " + host)).andReturn());
        assertThat(unread.get("unread").asInt()).isEqualTo(1);
        mvc.perform(get("/api/conversations/" + convId).header("Authorization", "Bearer " + host)).andExpect(status().isOk());
        unread = body(mvc.perform(get("/api/conversations/unread").header("Authorization", "Bearer " + host)).andReturn());
        assertThat(unread.get("unread").asInt()).isZero();

        // --- strangers can't read the conversation or edit the listing
        String other = register("other@example.com", "Other");
        mvc.perform(get("/api/conversations/" + convId).header("Authorization", "Bearer " + other))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/listings/" + listingId).header("Authorization", "Bearer " + other))
                .andExpect(status().isForbidden());

        // --- saved search round-trips its filters
        mvc.perform(post("/api/saved/searches").header("Authorization", "Bearer " + guest)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Cheap\",\"emailAlerts\":true,\"query\":{\"maxRent\":900,\"city\":\"Ypsilanti\"}}"))
                .andExpect(status().isCreated());

        // --- roommate post: create, find by budget and distance, message the poster
        Map<String, Object> rm = new java.util.HashMap<>(Map.of(
                "headline", "Looking for a roommate near campus", "about", "Tidy, quiet, early riser.",
                "budgetMin", 500, "budgetMax", 750, "city", "Ypsilanti", "state", "MI",
                "moveInDate", LocalDate.now().plusDays(30).toString(), "roommatesWanted", 1,
                "smokes", false, "hasPet", false));
        rm.put("latitude", 42.2475);
        rm.put("longitude", -83.6262);
        JsonNode post = body(mvc.perform(post("/api/roommates").header("Authorization", "Bearer " + guest)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(rm)))
                .andExpect(status().isCreated()).andReturn());
        long postId = post.get("id").asLong();
        assertThat(body(mvc.perform(get("/api/roommates").param("canPay", "700")).andReturn())
                .get("totalItems").asInt()).isEqualTo(1);
        assertThat(body(mvc.perform(get("/api/roommates").param("canPay", "800")).andReturn())
                .get("totalItems").asInt()).isZero();
        assertThat(body(mvc.perform(get("/api/roommates")
                .param("lat", "42.2506").param("lng", "-83.6240").param("radiusMiles", "2")).andReturn())
                .get("totalItems").asInt()).isEqualTo(1);
        JsonNode rmConv = body(mvc.perform(post("/api/roommates/" + postId + "/conversations")
                        .header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Want to look at places together?\"}"))
                .andExpect(status().isCreated()).andReturn());
        assertThat(rmConv.get("summary").get("subjectType").asText()).isEqualTo("ROOMMATE");
        JsonNode inbox = body(mvc.perform(get("/api/conversations").header("Authorization", "Bearer " + guest)).andReturn());
        assertThat(inbox.size()).isEqualTo(2);   // the listing thread + the roommate thread

        // --- marking as taken hides it from search
        mvc.perform(patch("/api/listings/" + listingId + "/status").header("Authorization", "Bearer " + host)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"TAKEN\"}"))
                .andExpect(status().isOk());
        JsonNode after = body(mvc.perform(get("/api/listings")).andReturn());
        assertThat(after.get("totalItems").asInt()).isZero();
    }

    private String register(String email, String name) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", "password123", "displayName", name))))
                .andExpect(status().isCreated()).andReturn();
        return body(r).get("token").asText();
    }

    private JsonNode body(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }
}
