import pytest
import httpx

from app.services.product_image_resolver import (
    ProductImageResolverError,
    _response_bytes,
    _validate_public_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/product.jpg",
        "http://127.0.0.1/product.jpg",
        "http://10.0.0.2/product.jpg",
        "http://172.16.0.10/product.jpg",
        "http://192.168.1.10/product.jpg",
        "http://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal/computeMetadata/v1",
    ],
)
def test_validate_public_url_blocks_private_hosts(url):
    with pytest.raises(ProductImageResolverError) as exc_info:
        _validate_public_url(url)

    assert exc_info.value.category == "invalid_input"


def test_response_bytes_rejects_large_content_length():
    response = httpx.Response(
        200,
        headers={"content-length": str(10 * 1024 * 1024 + 1)},
        content=b"",
    )

    with pytest.raises(ProductImageResolverError) as exc_info:
        _response_bytes(response)

    assert exc_info.value.category == "reference_rejected"


def test_response_bytes_rejects_large_body_without_header():
    response = httpx.Response(200, content=b"0" * (10 * 1024 * 1024 + 1))

    with pytest.raises(ProductImageResolverError) as exc_info:
        _response_bytes(response)

    assert exc_info.value.category == "reference_rejected"
