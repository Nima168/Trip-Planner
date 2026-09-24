# Fronts the ALB purely to terminate HTTPS on CloudFront's default
# *.cloudfront.net domain — the Vercel frontend is always HTTPS and browsers
# block fetch/XHR from an HTTPS page to a plain-HTTP API. CloudFront->ALB
# traffic stays HTTP (internal to AWS). This fronts an API, not static
# content, so caching is disabled and everything is forwarded untouched.
resource "aws_cloudfront_distribution" "this" {
  enabled = true
  comment = "${var.project} API (CloudFront -> ALB, HTTPS termination only)"

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    # AWS-managed policies: CachingDisabled + AllViewer (forward all
    # headers/cookies/query strings untouched) — appropriate for an API
    # origin, not static content.
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default *.cloudfront.net domain — AWS-managed certificate, no custom
  # domain/ACM cert needed for this MVP.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  price_class = "PriceClass_100"

  tags = merge(var.tags, { Name = "${var.project}-cdn" })
}
