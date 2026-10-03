package com.example.shop.order;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import com.example.shop.TestClockConfig;

@SpringBootTest
@AutoConfigureMockMvc
/**
 * 这里故意不加 @Transactional：请求要像线上一样在事务之外完成序列化，
 * 否则懒加载之类的问题在测试里看不出来。
 */
@Import(TestClockConfig.class)
class OrderControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void createAndFetchOrder() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("""
                {"customerId": "c-1", "items": [{"productId": 2, "quantity": 2}]}
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.totalAmount").value(318.00))
                .andExpect(jsonPath("$.payableAmount").value(318.00));
    }

    @Test
    void payOrder() throws Exception {
        MvcResult created = mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("""
                {"customerId": "c-1", "items": [{"productId": 1, "quantity": 1}]}
                """))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(post("/api/orders/{id}/pay", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.items[0].productName").value("机械键盘"));

        mvc.perform(post("/api/orders/{id}/pay", id))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidRequestIsRejected() throws Exception {
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("""
                {"customerId": "", "items": []}
                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownOrderIs404() throws Exception {
        mvc.perform(get("/api/orders/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("订单不存在：999"));
    }
}
